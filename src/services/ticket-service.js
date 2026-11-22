import { randomUUID } from 'node:crypto';
import { ChannelType, PermissionFlagsBits, ThreadAutoArchiveDuration } from 'discord.js';

const REASSURANCE = [
  'Our moderation team is doing its best to help you. Tickets are checked regularly, around the clock; during busy periods, replies may take longer.',
  'Thanks for reaching out. Our moderators review tickets 24/7, though higher demand can slow response times.',
  'We appreciate your patience. The team checks tickets regularly at all hours; busy periods may mean a longer wait.',
  'Your message matters to us. Moderation is active 24/7, but response times can vary when many tickets arrive.',
  'A moderator will help as soon as possible. Tickets are reviewed day and night, with occasional delays during busy periods.',
  'Thanks for waiting. Our team checks the queue around the clock; a surge in tickets can extend response times.',
  'We are working to help everyone. Tickets are monitored 24/7, but replies may be less frequent during peak demand.',
  'Your ticket is in the queue. Our moderators check it regularly, including overnight; busy periods may slow things down.',
  'We have received your request. The team reviews tickets all day and night, and may take longer during high volume.',
  'Our moderators are here to help. Tickets are checked regularly 24/7, although a busy queue can delay replies.',
  'Thanks for giving us the details. The team reviews requests around the clock; please allow extra time when the queue is busy.',
  'We will get to your ticket as soon as we can. Moderation checks tickets 24/7, with longer waits during surges.',
  'Your request has reached our team. Tickets are reviewed regularly at any hour, but high volume can affect reply times.',
  'We appreciate your patience while we look into this. Our team is active 24/7 and checks tickets regularly.',
  'A moderator will review this shortly. The queue is checked around the clock; exceptionally busy periods can cause delays.',
  'Thanks for contacting moderation. We review tickets day and night, though response frequency changes with ticket volume.',
  'We are doing our best to respond quickly. Tickets are checked 24/7, and a crowded queue may take more time.',
  'Your ticket is safely in our queue. Moderators review it regularly around the clock; thanks for bearing with us.',
  'We have your message. The team checks requests 24/7, but may reply more slowly when demand is high.',
  'Our team is on it. Tickets are reviewed regularly at all hours; busy times can mean a longer response window.',
  'Thanks for your patience. Moderation monitors tickets day and night, and works through them as quickly as possible.',
  'Your request is awaiting review. The queue is checked 24/7, with possible delays if many tickets arrive at once.',
  'We are glad you reached out. The team reviews tickets around the clock, though peak periods can slow replies.',
  'A member of moderation will be with you as soon as possible. Tickets are checked regularly, 24/7.',
  'We are working through the queue. Our moderators check tickets at all hours, but high traffic can extend the wait.',
  'Thanks for opening a ticket. The moderation team reviews tickets regularly 24/7; response times depend on current volume.',
  'Your concern is in the right place. We check tickets around the clock, with occasional slowdowns during busy periods.',
  'We will help as soon as a moderator is available. Tickets are reviewed day and night, even when replies take longer.',
  'Our moderation team is reviewing the queue regularly, 24/7. If traffic is high, please allow us extra time.',
  'Thanks for reaching out to us. We check tickets regularly around the clock, and we appreciate your patience during busy periods.',
];

export async function openTicket({ db, interaction, panel, topic, answers, language, priority }) {
  const guild = interaction.guild;
  const staffRoleIds = panel.config.staffRoleIds ?? [];
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageThreads] },
    ...staffRoleIds.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] })),
  ];
  const channel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90),
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
    reason: `Ticket opened by ${interaction.user.tag}`,
  });
  const ticketId = randomUUID();
  db.prepare('INSERT INTO tickets (id, panel_id, guild_id, channel_id, opener_id, topic_id, language, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(ticketId, panel.id, guild.id, channel.id, interaction.user.id, topic.id, language, priority);

  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
  const randomMessage = REASSURANCE[Math.floor(Math.random() * REASSURANCE.length)];
  const details = Object.entries(answers).map(([label, value]) => `**${label}:** ${String(value).slice(0, 1000)}`).join('\n');
  const embed = new EmbedBuilder().setTitle(topic.name).setDescription(details || 'No additional details provided.').setColor(0x5865f2);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket:close:${ticketId}`).setLabel('Close the Ticket').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket:claim:${ticketId}`).setLabel('Claim the Ticket').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ticket:ai:${ticketId}`).setLabel('Ask for AI opinion').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ticket:modchat:${ticketId}`).setLabel('Mod Chat').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ticket:priority:${ticketId}`).setLabel('Change the Priority').setStyle(ButtonStyle.Secondary),
  );
  const mentions = (panel.config.rolesMentionedOnOpen ?? []).filter((id) => guild.roles.cache.has(id)).map((id) => `<@&${id}>`).join(' ');
  await channel.send({ content: [mentions, randomMessage, `**Priority:** ${['Turtle 🐢', 'Low 🟢', 'Standard ⚪', 'High 🔴', 'World-collapsing ☄️'][priority - 1]}`].filter(Boolean).join('\n'), embeds: [embed], components: [row], allowedMentions: { roles: panel.config.rolesMentionedOnOpen ?? [] } });
  return channel;
}

export { REASSURANCE };
