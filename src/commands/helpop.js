import { SlashCommandBuilder, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { ACCESS_LEVELS, getAccessLevel } from '../services/authorization.js';
export default {
 data:new SlashCommandBuilder().setName('helpop').setDescription('Privately contact the bot moderators.')
  .addStringOption(option=>option.setName('what_happened').setDescription('Briefly explain what happened').setMinLength(1).setMaxLength(1500).setRequired(true)),
 async execute(interaction,{db,client}){
  if(!interaction.inGuild())return interaction.reply({content:'Use this command in a server.',ephemeral:true});
  const parent=interaction.channel;
  if(!parent||![ChannelType.GuildText,ChannelType.GuildAnnouncement].includes(parent.type)||!parent.threads)return interaction.reply({content:'Use /helpop in a regular server text channel.',ephemeral:true});
  await interaction.deferReply({ephemeral:true});
  const members=await interaction.guild.members.fetch();
  const moderators=[...members.values()].filter(member=>member.id!==client.user.id&&getAccessLevel(db,interaction.guildId,member.id,member.roles.cache)>=ACCESS_LEVELS.mod).slice(0,999);
  const thread=await parent.threads.create({name:'helpop-'+interaction.user.id.slice(-6),type:ChannelType.PrivateThread,invitable:false,autoArchiveDuration:1440,reason:'Private help request from '+interaction.user.tag});
  const memberIds=[...new Set([interaction.user.id,...moderators.map(member=>member.id)])];let failed=0;
  for(let i=0;i<memberIds.length;i+=25){const results=await Promise.allSettled(memberIds.slice(i,i+25).map(id=>thread.members.add(id)));failed+=results.filter(result=>result.status==='rejected').length;}
  const message=interaction.options.getString('what_happened',true).trim(),name=interaction.member?.displayName??interaction.user.username;
  const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('helpop:delete:'+interaction.user.id).setLabel('Delete').setStyle(ButtonStyle.Danger),new ButtonBuilder().setCustomId('helpop:read:'+interaction.user.id).setLabel('Select as read').setStyle(ButtonStyle.Primary));
  await thread.send({content:'**'+name.replace(/([\\*_~|>])/g,'\\$1')+':** '+message,components:[row],allowedMentions:{parse:[]}});
  const note=failed?' Some moderators could not be added; check the bot’s Manage Threads permission.':moderators.length===999?' The private thread member limit was reached.':'';
  return interaction.editReply({content:'Your private help request is available in '+thread+'.'+note});
 }
};
