import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getOrCreateTicketPanel, updatePanelConfig } from '../services/panel-service.js';

const roleIds = (input) => (input ?? '').split(',').map((value) => value.trim()).filter(Boolean);
export default {
  data: new SlashCommandBuilder()
    .setName('sentpanel')
    .setDescription('Post the ticket panel in this channel.')
    .addStringOption((o) => o.setName('title').setDescription('Panel title').setMaxLength(100))
    .addStringOption((o) => o.setName('description').setDescription('Panel description').setMaxLength(1500))
    .addStringOption((o) => o.setName('staff_role_ids').setDescription('Comma-separated role IDs allowed to see tickets').setMaxLength(500))
    .addStringOption((o) => o.setName('mention_role_ids').setDescription('Comma-separated role IDs pinged when a ticket opens').setMaxLength(500))
    .addStringOption((o) => o.setName('mod_chat_role_ids').setDescription('Comma-separated role IDs added to private Mod Chat').setMaxLength(500))
    .addStringOption((o) => o.setName('languages').setDescription('Enabled language codes, e.g. en,pl,de,es,fr').setMaxLength(30))
    .addBooleanOption((o) => o.setName('mod_chat').setDescription('Enable private Mod Chat button'))
    .addStringOption((o) => o.setName('topic_languages').setDescription('Optional per-topic languages: topic_id=en,pl;other=en').setMaxLength(500))
    .addBooleanOption((o) => o.setName('detector_suggestions').setDescription('Enable text-pattern detector for Super Suggestions'))
    .addBooleanOption((o) => o.setName('detector_dev_app').setDescription('Enable text-pattern detector for Development applications'))
    .addBooleanOption((o) => o.setName('detector_mod_app').setDescription('Enable text-pattern detector for Moderation applications')),
  async execute(interaction, { db }) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Run this command in a server channel.', ephemeral: true });
    const panel = getOrCreateTicketPanel(db, interaction.guildId, interaction.user.id);
    const config = panel.config;
    const parseRoles = (name, key) => {
      const value = interaction.options.getString(name);
      if (value === null) return;
      const ids = roleIds(value);
      if (ids.some((id) => !/^\d{15,22}$/.test(id) || !interaction.guild.roles.cache.has(id))) throw new Error(`Invalid role ID in ${name}.`);
      config[key] = [...new Set(ids)];
    };
    try {
      parseRoles('staff_role_ids', 'staffRoleIds');
      parseRoles('mention_role_ids', 'rolesMentionedOnOpen');
      parseRoles('mod_chat_role_ids', 'modChatRoleIds');
      const langs = interaction.options.getString('languages');
      if (langs !== null) {
        const parsed = [...new Set(langs.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean))];
        if (!parsed.length || parsed.some((lang) => !['en','pl','de','es','fr'].includes(lang))) throw new Error('Languages must be selected from en, pl, de, es, fr.');
        config.languages = parsed;
        if (!parsed.includes(config.defaultLanguage)) config.defaultLanguage = parsed[0];
      }
    } catch (error) {
      return interaction.reply({ content: error.message, ephemeral: true });
    }
    const modChat = interaction.options.getBoolean('mod_chat');
    if (modChat !== null) config.modChat = modChat;
    const topicLanguages = interaction.options.getString('topic_languages');
    if (topicLanguages !== null) {
      for (const topic of config.topics) topic.languages = null;
      for (const entry of topicLanguages.split(';').map((part) => part.trim()).filter(Boolean)) {
        const [topicId, rawLanguages] = entry.split('=');
        const topic = config.topics.find((item) => item.id === topicId?.trim());
        const allowed = [...new Set((rawLanguages ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean))];
        if (!topic || !allowed.length || allowed.some((lang) => !config.languages.includes(lang))) return interaction.reply({ content: 'Topic language format is invalid. Use topic_id=en,pl;other=en, and choose only languages enabled above.', ephemeral: true });
        topic.languages = allowed;
      }
    }
    for (const [option, topicId] of [['detector_suggestions','super_suggestions'],['detector_dev_app','development_application'],['detector_mod_app','moderation_application']]) {
      const enabled = interaction.options.getBoolean(option);
      if (enabled !== null) config.topics.find((topic) => topic.id === topicId).aiDetector = enabled;
    }
    updatePanelConfig(db, panel.id, config);

    const title = interaction.options.getString('title') || 'Aszi Friend Support';
    const customDescription = interaction.options.getString('description') || 'Choose the topic that best matches your request after clicking below.';
    const description = customDescription + '\n\nBefore creating a ticket, please read the FAQ and familiarize yourself with the server rules.\nFAQ: <#1574181136026964180>';
    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x5865f2);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`panel:create:${panel.id}`).setLabel('Create Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary));
    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Ticket panel posted in this channel.', ephemeral: true });
  },
};
