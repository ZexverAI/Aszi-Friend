import { SlashCommandBuilder } from 'discord.js';
import { ACCESS_LEVELS, BOT_OWNER_ID, grantAccess, hasAccessLevel, isOwner } from '../services/authorization.js';
import { syncGrantAfterToggle } from '../services/permission-access.js';
export default {data:new SlashCommandBuilder().setName('grantrole').setDescription('Grant or toggle a bot-only access level.')
.addStringOption(o=>o.setName('level').setDescription('Access level').setRequired(true).addChoices({name:'Mod',value:'mod'},{name:'Smod',value:'smod'},{name:'Tmod',value:'tmod'}))
.addStringOption(o=>o.setName('user_id').setDescription('Discord user ID').setRequired(false)).addStringOption(o=>o.setName('role_id').setDescription('Discord role ID').setRequired(false)),
async execute(i,{db}){if(!hasAccessLevel(db,i,3))return i.reply({content:'Only tmod can grant access levels.',ephemeral:true});
const u=i.options.getString('user_id'),r=i.options.getString('role_id');if(Boolean(u)===Boolean(r))return i.reply({content:'Provide exactly one of user_id or role_id.',ephemeral:true});
const type=u?'user':'role',id=u??r,level=ACCESS_LEVELS[i.options.getString('level',true)];if(level===ACCESS_LEVELS.tmod&&!isOwner(i.user.id))return i.reply({content:'Only the bot owner can grant tmod access.',ephemeral:true});if(!/^\d{15,22}$/.test(id))return i.reply({content:'Invalid Discord ID.',ephemeral:true});
if(type==='user'&&id===BOT_OWNER_ID)return i.reply({content:'The owner has permanent access.',ephemeral:true});
if(type==='role'){const role=await i.guild.roles.fetch(id).catch(()=>null);if(!role||role.id===i.guild.roles.everyone.id||role.managed)return i.reply({content:'Choose a valid unmanaged role from this server.',ephemeral:true});}
const result=grantAccess(db,i.guildId,type,id,level,i.user.id);if(result==='protected')return i.reply({content:'Only the bot owner can change or remove an existing tmod grant.',ephemeral:true});const sync=await syncGrantAfterToggle(i.guild,db,type,id,result),label=type==='role'?'<@&'+id+'>':'<@'+id+'>';
return i.reply({content:'Bot-only '+i.options.getString('level')+' access '+result+' for '+label+'.'+(sync.failed?' Failed ticket updates: '+sync.failed+'.':''),ephemeral:true,allowedMentions:{parse:[]}});}};