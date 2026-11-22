import { SlashCommandBuilder } from 'discord.js';
import { getOrCreateTicketPanel, updatePanelConfig } from '../services/panel-service.js';
const LANGUAGES = [{"name":"English","value":"en"},{"name":"Polski","value":"pl"},{"name":"Deutsch","value":"de"},{"name":"Español","value":"es"},{"name":"Français","value":"fr"}];
export default {
  data: new SlashCommandBuilder().setName('removelanguage').setDescription('Disable a language in ticket forms.')
    .addStringOption((o) => o.setName('language').setDescription('Language to disable').setRequired(true).addChoices(...LANGUAGES)),
  async execute(interaction, { db }) {
    const panel = getOrCreateTicketPanel(db, interaction.guildId, interaction.user.id);
    const language = interaction.options.getString('language', true);
    if (!panel.config.languages.includes(language)) return interaction.reply({ content: 'That language is not currently enabled.', ephemeral: true });
    if (panel.config.languages.length <= 1) return interaction.reply({ content: 'Keep at least one language enabled.', ephemeral: true });
    panel.config.languages = panel.config.languages.filter((code) => code !== language);
    if (panel.config.defaultLanguage === language) panel.config.defaultLanguage = panel.config.languages[0];
    updatePanelConfig(db, panel.id, panel.config);
    const names = panel.config.languages.map((code) => LANGUAGES.find((item) => item.value === code)?.name ?? code).join(', ');
    await interaction.reply({ content: `Disabled **${LANGUAGES.find((item) => item.value === language).name}**. Active ticket languages: ${names}.`, ephemeral: true });
  },
};
