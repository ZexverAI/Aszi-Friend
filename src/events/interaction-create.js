import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ThreadAutoArchiveDuration } from 'discord.js';
import { getPanel, getOrCreateTicketPanel } from '../services/panel-service.js';
import { openTicket } from '../services/ticket-service.js';
import { reviewApplication, renderSemicircle, formatScore } from '../lib/ai-review.js';
import { t } from '../lib/locales.js';
import { ADMIN_COMMANDS, isAuthorizedForAdmin, isOwner } from '../services/authorization.js';

const LANGUAGES = { en: 'English', pl: 'Polski', de: 'Deutsch', es: 'Español', fr: 'Français' };
const PRIORITIES = ['Turtle 🐢', 'Low 🟢', 'Standard ⚪', 'High 🔴', 'World-collapsing ☄️'];
const canModerate = (member, panel) => member.permissions.has(PermissionFlagsBits.ManageChannels) || (panel?.config.staffRoleIds ?? []).some((id) => member.roles.cache.has(id));
const topicFor = (panel, id) => panel?.config.topics?.find((topic) => topic.id === id);
const topicOpen = (panel, id) => topicFor(panel, id)?.enabled !== false && Boolean(topicFor(panel, id));

export default async function handleInteraction(interaction, context) {
  const { db, client } = context;
  if (interaction.isChatInputCommand()) {
    if (ADMIN_COMMANDS.has(interaction.commandName)) {
      if (!interaction.inGuild()) return interaction.reply({ content: 'Run ticket administration commands in a server.', ephemeral: true });
      if (!isAuthorizedForAdmin(interaction, db)) return interaction.reply({ content: 'You are not authorized to use ticket administration commands.', ephemeral: true });
      if (['grantrole', 'revokerole'].includes(interaction.commandName) && !isOwner(interaction.user.id)) return interaction.reply({ content: 'Only the bot owner can authorize or revoke roles.', ephemeral: true });
    }
    const command = client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction, context);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket:form:')) {
    const [, , panelId, topicId, language, priorityText] = interaction.customId.split(':');
    const panel = getPanel(db, panelId);
    const topic = topicFor(panel, topicId);
    if (!panel || panel.guild_id !== interaction.guildId || !topic || topic.enabled === false || !(panel.config.languages ?? ['en']).includes(language) || (topic.languages && !topic.languages.includes(language))) return interaction.reply({ content: 'This ticket topic or language is currently unavailable.', ephemeral: true });
    const answers = {};
    if (topic.application) {
      const first = interaction.fields.getTextInputValue('field_0').trim();
      const second = interaction.fields.getTextInputValue('field_1')?.trim() ?? '';
      const cv = [first, second].filter(Boolean).join('\n');
      if (!first || cv.length > 5000) return interaction.reply({ content: 'Your CV/application must contain between 1 and 5,000 characters.', ephemeral: true });
      answers['CV / application'] = cv;
    } else {
      const details = interaction.fields.getTextInputValue('field_0').trim();
      if (!details || details.length > 1000) return interaction.reply({ content: 'Please provide 1–1,000 characters in “Give us a few details”.', ephemeral: true });
      answers['Give us a few details'] = details;
    }
    const channel = await openTicket({ db, interaction, panel, topic, answers, language, priority: Number(priorityText) || 3 });
    client.wizards.delete(interaction.user.id);
    return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
  }

  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
  const parts = interaction.customId.split(':');

  if (parts[0] === 'panel' && interaction.isButton() && parts[1] === 'create') {
    const panel = getPanel(db, parts[2]);
    if (!panel || panel.guild_id !== interaction.guildId) return interaction.reply({ content: 'Panel not found.', ephemeral: true });
    const topics = (panel.config.topics ?? []).filter((topic) => topic.enabled !== false);
    if (!topics.length) return interaction.reply({ content: 'All ticket topics are currently closed.', ephemeral: true });
    const languages = (panel.config.languages ?? ['en']).filter((lang) => LANGUAGES[lang]);
    const topicMenu = new StringSelectMenuBuilder().setCustomId(`wizard:topic:${panel.id}`).setPlaceholder('Choose a ticket topic').addOptions(topics.slice(0, 25).map((topic) => ({ label: topic.name.slice(0, 100), value: topic.id, description: (topic.description ?? 'Open a ticket for this topic').slice(0, 100) })));
    const languageMenu = new StringSelectMenuBuilder().setCustomId(`wizard:language:${panel.id}`).setPlaceholder('Choose a language').addOptions((languages.length ? languages : ['en']).map((lang) => ({ label: LANGUAGES[lang], value: lang })));
    const priorityMenu = new StringSelectMenuBuilder().setCustomId(`wizard:priority:${panel.id}`).setPlaceholder('Choose a priority').addOptions(PRIORITIES.map((label, index) => ({ label, value: String(index + 1) })));
    const next = new ButtonBuilder().setCustomId(`wizard:next:${panel.id}`).setLabel('Continue').setStyle(ButtonStyle.Primary);
    client.wizards.set(interaction.user.id, { panelId: panel.id, language: languages.includes(panel.config.defaultLanguage) ? panel.config.defaultLanguage : (languages[0] ?? 'en'), priority: 3 });
    return interaction.reply({ content: 'Choose a topic, language, and priority before opening your ticket.', components: [new ActionRowBuilder().addComponents(topicMenu), new ActionRowBuilder().addComponents(languageMenu), new ActionRowBuilder().addComponents(priorityMenu), new ActionRowBuilder().addComponents(next)], ephemeral: true });
  }

  if (parts[0] === 'wizard') {
    const state = client.wizards.get(interaction.user.id);
    const panel = state && getPanel(db, state.panelId);
    if (!panel || panel.id !== parts[2]) return interaction.reply({ content: 'Start again from the ticket panel.', ephemeral: true });
    if (interaction.isStringSelectMenu()) {
      if (parts[1] === 'topic') {
        if (!topicOpen(panel, interaction.values[0])) return interaction.reply({ content: 'That topic is currently closed.', ephemeral: true });
        state.topicId = interaction.values[0];
        const selected = topicFor(panel, state.topicId);
        if (selected.languages && !selected.languages.includes(state.language)) state.language = selected.languages[0];
      } else if (parts[1] === 'language') {
        const selectedTopic = topicFor(panel, state.topicId);
        if (!(panel.config.languages ?? ['en']).includes(interaction.values[0]) || (selectedTopic?.languages && !selectedTopic.languages.includes(interaction.values[0]))) return interaction.reply({ content: 'That language is disabled for this topic.', ephemeral: true });
        state.language = interaction.values[0];
      } else if (parts[1] === 'priority') state.priority = Number(interaction.values[0]);
      client.wizards.set(interaction.user.id, state);
      return interaction.deferUpdate();
    }
    if (parts[1] === 'next') {
      const topic = topicFor(panel, state.topicId);
      if (!topic || topic.enabled === false) return interaction.reply({ content: 'Choose an open topic first.', ephemeral: true });
      const fields = topic.application
        ? [{ label: 'CV / application (part 1, up to 4,000)', required: true, minLength: 1, maxLength: 4000 }, { label: 'CV / application (part 2, up to 1,000)', required: false, minLength: 0, maxLength: 1000 }]
        : [{ label: 'Give us a few details (up to 1,000)', required: true, minLength: 1, maxLength: 1000 }];
      const modal = new ModalBuilder().setCustomId(`ticket:form:${panel.id}:${topic.id}:${state.language}:${state.priority}`).setTitle(topic.application ? 'Application' : 'Ticket details');
      modal.addComponents(...fields.map((field, i) => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`field_${i}`).setLabel(field.label).setStyle(TextInputStyle.Paragraph).setMinLength(field.minLength).setMaxLength(field.maxLength).setRequired(field.required))));
      return interaction.showModal(modal);
    }
  }

  if (parts[0] === 'ticket' && interaction.isButton()) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND guild_id = ?').get(parts[2], interaction.guildId);
    if (!ticket) return interaction.reply({ content: 'Ticket record not found.', ephemeral: true });
    const panel = getPanel(db, ticket.panel_id);
    const topic = topicFor(panel, ticket.topic_id);
    if (parts[1] !== 'priority' && !canModerate(interaction.member, panel) && interaction.user.id !== ticket.opener_id) return interaction.reply({ content: 'You cannot use this ticket control.', ephemeral: true });
    if (parts[1] === 'close') {
      if (interaction.user.id !== ticket.opener_id && !canModerate(interaction.member, panel)) return interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', ephemeral: true });
      db.prepare("UPDATE tickets SET status='closed', closed_at=CURRENT_TIMESTAMP WHERE id=?").run(ticket.id);
      await interaction.channel.permissionOverwrites.edit(ticket.opener_id, { SendMessages: false });
      return interaction.reply({ content: t(ticket.language, 'closed') });
    }
    if (parts[1] === 'claim') {
      if (!canModerate(interaction.member, panel)) return interaction.reply({ content: 'Staff only.', ephemeral: true });
      db.prepare('UPDATE tickets SET claimed_by=? WHERE id=?').run(interaction.user.id, ticket.id);
      return interaction.reply({ content: t(ticket.language, 'claimed', { user: interaction.user }) });
    }
    if (parts[1] === 'ai') {
      if (!canModerate(interaction.member, panel)) return interaction.reply({ content: 'Staff only.', ephemeral: true });
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
      if (!canModerate(interaction.member, panel)) return interaction.reply({ content: 'Staff only.', ephemeral: true });
      if (panel.config.modChat === false || topic?.modChat === false) return interaction.reply({ content: 'Mod Chat is disabled for this panel/topic.', ephemeral: true });
      const roleIds = panel.config.modChatRoleIds ?? panel.config.staffRoleIds ?? [];
      const members = await interaction.guild.members.fetch();
      const thread = await interaction.channel.threads.create({ name: 'moderation-only', type: 12, invitable: false, autoArchiveDuration: ThreadAutoArchiveDuration.OneDay, reason: 'Private moderator discussion' });
      const selected = [...new Set(members.filter((member) => roleIds.some((id) => member.roles.cache.has(id))).map((member) => member.id))].slice(0, 50);
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
