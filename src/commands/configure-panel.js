import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } from 'discord.js';
import { getPanel } from '../services/panel-service.js';
export default {
  data: new SlashCommandBuilder().setName('configurepanel').setDescription('Edit advanced panel options using JSON.')
    .addStringOption((option) => option.setName('panel_id').setDescription('Panel ID from /listpanels').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, { db }) {
    const panel = getPanel(db, interaction.options.getString('panel_id', true));
    if (!panel || panel.guild_id !== interaction.guildId) return interaction.reply({ content: 'Panel not found in this server.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId(`panel:configure:${panel.id}`).setTitle('Panel configuration');
    const input = new TextInputBuilder().setCustomId('config').setLabel('Configuration JSON').setStyle(TextInputStyle.Paragraph).setMaxLength(3900).setValue(JSON.stringify(panel.config, null, 2)).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },
};
