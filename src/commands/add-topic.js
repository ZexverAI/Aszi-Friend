import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
export default {
  data: new SlashCommandBuilder().setName('addtopic').setDescription('Add a topic and its form fields to a panel draft.')
    .addStringOption((option) => option.setName('panel_id').setDescription('Panel ID from /listpanels').setRequired(true))
    ,
  async execute(interaction, { db }) {
    const panelId = interaction.options.getString('panel_id', true);
    if (!db.prepare('SELECT id FROM panels WHERE id = ? AND guild_id = ?').get(panelId, interaction.guildId)) return interaction.reply({ content: 'Panel not found in this server.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId(`topic:add:${panelId}`).setTitle('Add ticket topic');
    const name = new TextInputBuilder().setCustomId('name').setLabel('Topic name').setStyle(TextInputStyle.Short).setMaxLength(80).setRequired(true);
    const spec = new TextInputBuilder().setCustomId('fields').setLabel('Form fields JSON (up to 5 fields)').setStyle(TextInputStyle.Paragraph).setMaxLength(1800).setPlaceholder('[{"label":"What happened?","required":true,"minLength":20,"maxLength":1000}]').setRequired(false);
    const options = new TextInputBuilder().setCustomId('options').setLabel('Languages and feature switches JSON').setStyle(TextInputStyle.Paragraph).setMaxLength(1800).setPlaceholder('{"languages":["en","pl"],"aiDetector":true,"modChat":true}').setRequired(false);
    modal.addComponents(new ActionRowBuilder().addComponents(name), new ActionRowBuilder().addComponents(spec), new ActionRowBuilder().addComponents(options));
    await interaction.showModal(modal);
  },
};
