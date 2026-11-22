import { SlashCommandBuilder } from 'discord.js';
import { getOrCreateTicketPanel, updatePanelConfig } from '../services/panel-service.js';
const LANGUAGES = [{"name":"English","value":"en"},{"name":"Polski","value":"pl"},{"name":"Deutsch","value":"de"},{"name":"Español","value":"es"},{"name":"Français","value":"fr"}];
export default {
  data: new SlashCommandBuilder().setName('addlanguage').setDescription('Enable a translated language for ticket forms.')
    .addStringOption((o) => o.setName('language').setDescription('Language to enable').setRequired(true).addChoices(...LANGUAGES)),
  async execute(interaction, { db }) {
    const panel = getOrCreateTicketPanel(db, interaction.guildId, interaction.user.id);
    const language = interaction.options.getString('language', true);
    if (panel.config.languages.includes(language)) return interaction.reply({ content: 'That language is already enabled.', ephemeral: true });
    panel.config.languages.push(language);
    updatePanelConfig(db, panel.id, panel.config);
    const names = panel.config.languages.map((code) => LANGUAGES.find((item) => item.value === code)?.name ?? code).join(', ');
    await interaction.reply({ content: `Enabled **${LANGUAGES.find((item) => item.value === language).name}**. Active ticket languages: ${names}.`, ephemeral: true });
  },
};
