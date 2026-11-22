import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getPanel } from '../services/panel-service.js';
export default {
  data: new SlashCommandBuilder().setName('publishpanel').setDescription('Post a configured ticket panel in a channel when you choose.')
    .addStringOption((option) => option.setName('panel_id').setDescription('Panel ID from /listpanels').setRequired(true))
    .addChannelOption((option) => option.setName('channel').setDescription('Channel to publish in').setRequired(true))
    ,
  async execute(interaction, { db }) {
    const panel = getPanel(db, interaction.options.getString('panel_id', true));
    if (!panel || panel.guild_id !== interaction.guildId) return interaction.reply({ content: 'Panel not found in this server.', ephemeral: true });
    const channel = interaction.options.getChannel('channel', true);
    if (!channel.isTextBased() || !panel.config.topics?.some((topic) => topic.enabled !== false)) return interaction.reply({ content: 'Choose a text channel and configure at least one enabled topic first.', ephemeral: true });
    await channel.send({ embeds: [new EmbedBuilder().setTitle(panel.name).setDescription(panel.description || 'Choose a topic to open a ticket.').setColor(0x5865f2)], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`panel:create:${panel.id}`).setLabel(panel.config.buttonLabel || 'Create a ticket').setStyle(ButtonStyle.Primary))] });
    await interaction.reply({ content: `Panel published in ${channel}.`, ephemeral: true });
  },
};
