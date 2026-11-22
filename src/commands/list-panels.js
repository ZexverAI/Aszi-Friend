import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { listPanels } from '../services/panel-service.js';
export default {
  data: new SlashCommandBuilder().setName('listpanels').setDescription('List ticket panel drafts and their IDs.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, { db }) {
    const panels = listPanels(db, interaction.guildId);
    const text = panels.length ? panels.map((panel) => `• ${panel.name} — ID: \`${panel.id}\``).join('\n') : 'No panel drafts yet. Use /setuppanel.';
    await interaction.reply({ content: text, ephemeral: true });
  },
};
