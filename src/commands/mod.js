import { SlashCommandBuilder } from 'discord.js';
import { ACCESS_LEVELS, BOT_OWNER_ID, grantAccess, hasAccessLevel } from '../services/authorization.js';
import { syncGrantAfterToggle } from '../services/permission-access.js';
export default {data:new SlashCommandBuilder().setName('mod').setDescription('Toggle bot-only mod access.')
.addStringOption(o=>o.setName('user_id').setDescription('Discord user ID').setRequired(false))
.addStringOption(o=>o.setName('role_id').setDescription('Discord role ID').setRequired(false)),
async execute(i,{db}){if(!hasAccessLevel(db,i,ACCESS_LEVELS.smod))return i.reply({content:'You cannot manage this access level.',ephemeral:true});
const u=i.options.getString('user_id'),r=i.options.getString('role_id');if(Boolean(u)===Boolean(r))return i.reply({content:'Provide exactly one of user_id or role_id.',ephemeral:true});
const type=u?'user':'role',id=u??r;if(!/^\d{15,22}$/.test(id))return i.reply({content:'Invalid Discord ID.',ephemeral:true});
if(type==='user'&&id===BOT_OWNER_ID)return i.reply({content:'The owner has permanent access.',ephemeral:true});
if(type==='role'){const role=await i.guild.roles.fetch(id).catch(()=>null);if(!role||role.id===i.guild.roles.everyone.id||role.managed)return i.reply({content:'Choose a valid unmanaged role from this server.',ephemeral:true});}
const result=grantAccess(db,i.guildId,type,id,ACCESS_LEVELS.mod,i.user.id);const sync=await syncGrantAfterToggle(i.guild,db,type,id,result);
const label=type==='role'?'<@&'+id+'>':'<@'+id+'>';const verb=result==='removed'?'removed':result==='updated'?'updated':'granted';
return i.reply({content:'Bot-only mod access '+verb+' for '+label+'. Discord role memberships were not changed.'+(sync.failed?' Existing ticket channels failed to update: '+sync.failed+'.':''),ephemeral:true,allowedMentions:{parse:[]}});}};