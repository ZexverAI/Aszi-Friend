import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, LabelBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ThreadAutoArchiveDuration } from 'discord.js';
import { getPanel } from '../services/panel-service.js';
import { openTicket } from '../services/ticket-service.js';
import { reviewApplication, renderSemicircle, formatScore } from '../lib/ai-review.js';
import { t } from '../lib/locales.js';
import { ADMIN_COMMANDS, ACCESS_LEVELS, hasAccessLevel, hasTicketModerationAccess, isAuthorizedForAdmin } from '../services/authorization.js';

const LANGUAGES = { en: 'English', pl: 'Polski', de: 'Deutsch', es: 'Español', fr: 'Français' };
const PRIORITIES = ['Turtle 🐢', 'Low 🟢', 'Standard ⚪', 'High 🔴', 'World-collapsing ☄️'];
const canModerate = (db, guildId, member, panel) => hasTicketModerationAccess(db, guildId, member, panel);
const topicFor = (panel, id) => panel?.config.topics?.find((topic) => topic.id === id);
const topicOpen = (panel, id) => topicFor(panel, id)?.enabled !== false && Boolean(topicFor(panel, id));

export default async function handleInteraction(interaction, context) {
  const { db, client } = context;
  if (interaction.isChatInputCommand()) {
    if (ADMIN_COMMANDS.has(interaction.commandName)) {
      if (!interaction.inGuild()) return interaction.reply({ content: 'Run ticket administration commands in a server.', ephemeral: true });
      const needed = interaction.commandName === 'mod' ? 2 : ['smod','tmod','grantrole','revokerole'].includes(interaction.commandName) ? 3 : 2;
      if (!hasAccessLevel(db, interaction, needed)) return interaction.reply({ content: 'You do not have the required bot access level for this command.', ephemeral: true });
    }
    const command = client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction, context);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('announce:')) {
    const [, channelId, ownerId] = interaction.customId.split(':');
    if (!interaction.inGuild() || ownerId !== interaction.user.id) return interaction.reply({ content: 'This announcement form is not valid for your account.', ephemeral: true });
    if (!isAuthorizedForAdmin(interaction, db)) return interaction.reply({ content: 'You are not authorized to publish announcements.', ephemeral: true });

    const title = interaction.fields.getTextInputValue('announcement_title').trim();
    const description = interaction.fields.getTextInputValue('announcement_description').trim();
    if (!title || !description) return interaction.reply({ content: 'Both the announcement title and description are required.', ephemeral: true });

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return interaction.reply({ content: 'The original channel is no longer available.', ephemeral: true });
    const embed = new EmbedBuilder()
      .setColor(0x808080)
      .setTitle(title)
      .setDescription(description);
    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    return interaction.reply({ content: 'Announcement sent.', ephemeral: true });
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket:form:')) {
    const panelId = interaction.customId.split(':')[2];
    const topicId = interaction.fields.getStringSelectValues('form_topic')?.[0];
    const language = interaction.fields.getStringSelectValues('form_language')?.[0];
    const priority = Number(interaction.fields.getStringSelectValues('form_priority')?.[0]);
    const panel = getPanel(db, panelId);
    const topic = topicFor(panel, topicId);
    if (!panel || panel.guild_id !== interaction.guildId || !topic || topic.enabled === false) return interaction.reply({ content: 'This ticket topic is currently unavailable.', ephemeral: true });
    if (!(panel.config.languages ?? ['en']).includes(language) || (topic.languages && !topic.languages.includes(language))) return interaction.reply({ content: 'That language is disabled for this topic. Please reopen the form and choose an enabled language.', ephemeral: true });
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) return interaction.reply({ content: 'Choose a valid ticket priority.', ephemeral: true });

    const first = interaction.fields.getTextInputValue('form_details').trim();
    const continuation = interaction.fields.getTextInputValue('form_continuation').trim();
    const answers = {};
    if (topic.application) {
      const cv = [first, continuation].filter(Boolean).join('\n');
      if (!first || cv.length > 5000) return interaction.reply({ content: 'Your CV/application must contain between 1 and 5,000 characters.', ephemeral: true });
      answers['CV / application'] = cv;
    } else {
      if (continuation) return interaction.reply({ content: 'The second text field is only for application CVs. Please reopen the form and leave it blank for this topic.', ephemeral: true });
      if (!first || first.length > 1000) return interaction.reply({ content: 'Please provide 1–1,000 characters in “Give us a few details”.', ephemeral: true });
      answers['Give us a few details'] = first;
    }
    const channel = await openTicket({ db, interaction, panel, topic, answers, language, priority });
    return interaction.reply({ content: 'Ticket created: ' + channel, ephemeral: true });
  }

  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
  const parts = interaction.customId.split(':');

  if (parts[0] === 'panel' && interaction.isButton() && parts[1] === 'create') {
    const panel = getPanel(db, parts[2]);
    if (!panel || panel.guild_id !== interaction.guildId) return interaction.reply({ content: 'Panel not found.', ephemeral: true });
    const topics = (panel.config.topics ?? []).filter((topic) => topic.enabled !== false).slice(0, 25);
    if (!topics.length) return interaction.reply({ content: 'All ticket topics are currently closed.', ephemeral: true });
    const languages = (panel.config.languages ?? ['en']).filter((lang) => LANGUAGES[lang]);
    const activeLanguages = languages.length ? languages : ['en'];

    const topicSelect = new StringSelectMenuBuilder()
      .setCustomId('form_topic')
      .setPlaceholder('Choose a ticket topic')
      .addOptions(topics.map((topic, index) => ({
        label: topic.name.slice(0, 100),
        value: topic.id,
        description: (topic.description ?? 'Open a ticket for this topic').slice(0, 100),
        default: index === 0,
      })));
    const languageSelect = new StringSelectMenuBuilder()
      .setCustomId('form_language')
      .setPlaceholder('Choose a language')
      .addOptions(activeLanguages.map((language) => ({
        label: LANGUAGES[language],
        value: language,
        default: language === panel.config.defaultLanguage,
      })));
    const prioritySelect = new StringSelectMenuBuilder()
      .setCustomId('form_priority')
      .setPlaceholder('Choose a priority')
      .addOptions(PRIORITIES.map((label, index) => ({ label, value: String(index + 1), default: index === 2 })));

    const detailsInput = new TextInputBuilder()
      .setCustomId('form_details')
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(1)
      .setMaxLength(4000)
      .setRequired(true);
    const continuationInput = new TextInputBuilder()
      .setCustomId('form_continuation')
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(0)
      .setMaxLength(1000)
      .setRequired(false);

    const modal = new ModalBuilder()
      .setCustomId('ticket:form:' + panel.id)
      .setTitle('Create a Ticket')
      .addLabelComponents(
        new LabelBuilder().setLabel('Ticket topic').setStringSelectMenuComponent(topicSelect),
        new LabelBuilder().setLabel('Language').setDescription('Some topics may have fewer enabled languages.').setStringSelectMenuComponent(languageSelect),
        new LabelBuilder().setLabel('Priority').setStringSelectMenuComponent(prioritySelect),
        new LabelBuilder().setLabel('Details or CV / application').setDescription('Other topics: max 1,000 characters. Applications: up to 4,000 characters here.').setTextInputComponent(detailsInput),
        new LabelBuilder().setLabel('CV continuation (applications only)').setDescription('Leave this blank for all non-application topics. Up to 1,000 characters.').setTextInputComponent(continuationInput),
      );
    return interaction.showModal(modal);
  }

  if (parts[0] === 'ticket' && interaction.isButton()) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND guild_id = ?').get(parts[2], interaction.guildId);
    if (!ticket) return interaction.reply({ content: 'Ticket record not found.', ephemeral: true });
    const panel = getPanel(db, ticket.panel_id);
    const topic = topicFor(panel, ticket.topic_id);
    if (parts[1] !== 'priority' && !canModerate(db, interaction.guildId, interaction.member, panel) && interaction.user.id !== ticket.opener_id) return interaction.reply({ content: 'You cannot use this ticket control.', ephemeral: true });
    if (parts[1] === 'close') {
      if (interaction.user.id !== ticket.opener_id && !canModerate(db, interaction.guildId, interaction.member, panel)) return interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', ephemeral: true });
      db.prepare("UPDATE tickets SET status='closed', closed_at=CURRENT_TIMESTAMP WHERE id=?").run(ticket.id);
      await interaction.channel.permissionOverwrites.edit(ticket.opener_id, { SendMessages: false });
      return interaction.reply({ content: t(ticket.language, 'closed') });
    }
    if (parts[1] === 'claim') {
      if (!canModerate(db, interaction.guildId, interaction.member, panel)) return interaction.reply({ content: 'Staff only.', ephemeral: true });
      db.prepare('UPDATE tickets SET claimed_by=? WHERE id=?').run(interaction.user.id, ticket.id);
      return interaction.reply({ content: t(ticket.language, 'claimed', { user: interaction.user }) });
    }
    if (parts[1] === 'ai') {
      if (!canModerate(db, interaction.guildId, interaction.member, panel)) return interaction.reply({ content: 'Staff only.', ephemeral: true });
      if (!topic?.application) return interaction.reply({ content: 'AI opinion is available only for applications.', ephemeral: true });
      const result = reviewApplication(JSON.parse(ticket.submission_json || '{}'));
      const detectorEnabled = panel.config.aiDetector !== false && topic.aiDetector !== false;
      const detail = detectorEnabled ? result.fieldReviews.map((field) => `• ${field.label}: ${field.score == null ? 'insufficient text' : `pattern index ${formatScore(field.score, ticket.language)}`} — ${field.reasons.join(' ')}`).join('\n') : 'Text pattern review is disabled for this topic.';
      const pattern = !detectorEnabled ? 'Text pattern detector is disabled for this topic.' : result.patternScore == null ? 'Text pattern indicator: insufficient text (30-word minimum).' : 'Text pattern indicator: ' + formatScore(result.patternScore, ticket.language) + '. This is not an AI probability or proof of authorship.\n\n' + renderSemicircle(result.patternScore);
      const embed = new EmbedBuilder().setTitle(t(ticket.language, 'reviewTitle')).setDescription(`Application completeness score: ${result.applicationScore}/100 (a basic completeness heuristic).\n\n${pattern}\n\n${result.reasons.map((reason) => `• ${reason}`).join('\n')}\n\nPer-field review:\n${detail || 'No form answers to review.'}\n\nUse this as a prompt for human review, never as proof or the sole basis for a decision.`).setColor(0x5865f2);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (parts[1] === 'priority') {
      const menu = new StringSelectMenuBuilder().setCustomId(`ticketpriority:${ticket.id}`).setPlaceholder('Choose priority').addOptions(PRIORITIES.map((label, index) => ({ label, value: String(index + 1) })));
      return interaction.reply({ content: 'Select a priority:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
    }
    if (parts[1] === 'modchat') {
      if (!canModerate(db, interaction.guildId, interaction.member, panel)) return interaction.reply({ content: 'Staff only.', ephemeral: true });
      if (panel.config.modChat === false || topic?.modChat === false) return interaction.reply({ content: 'Mod Chat is disabled for this panel/topic.', ephemeral: true });
      const roleIds = panel.config.modChatRoleIds ?? panel.config.staffRoleIds ?? [];
      const members = await interaction.guild.members.fetch();
      const thread = await interaction.channel.threads.create({ name: 'moderation-only', type: 12, invitable: false, autoArchiveDuration: ThreadAutoArchiveDuration.OneDay, reason: 'Private moderator discussion' });
      const selected = [...new Set(members.filter((member) => roleIds.some((id) => member.roles.cache.has(id)) || hasTicketModerationAccess(db, interaction.guildId, member, panel)).map((member) => member.id))].slice(0, 50)
      for (const userId of selected) await thread.members.add(userId).catch(() => null);
      return interaction.reply({ content: `Private moderation thread created: ${thread}`, ephemeral: true });
    }
  }

  if (interaction.isStringSelectMenu() && parts[0] === 'ticketpriority') {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id=? AND guild_id=?').get(parts[1], interaction.guildId);
    if (!ticket) return interaction.reply({ content: 'Ticket not found.', ephemeral: true });
    const priority = Number(interaction.values[0]);
    db.prepare('UPDATE tickets SET priority=? WHERE id=?').run(priority, ticket.id);
    const channel = await interaction.guild.channels.fetch(ticket.channel_id).catch(() => null);
    if (channel?.isTextBased()) {
      const messages = await channel.messages.fetch({ limit: 25 }).catch(() => null);
      const ticketMessage = messages?.find((message) => message.components.some((row) => row.components.some((component) => component.customId === `ticket:priority:${ticket.id}`)));
      if (ticketMessage) {
        const content = ticketMessage.content.replace(/^\*\*Priority:\*\*.*(?:\r?\n)?/m, '').trim();
        await ticketMessage.edit({ content: [content, `**Priority:** ${PRIORITIES[priority - 1]}`].filter(Boolean).join('\n') });
      }
    }
    return interaction.update({ content: `Priority updated: ${PRIORITIES[priority - 1]}`, components: [] });
  }
}
