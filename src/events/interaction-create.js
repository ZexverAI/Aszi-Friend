import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ThreadAutoArchiveDuration } from 'discord.js';
import { createPanel, getPanel, updatePanelConfig, addTopic } from '../services/panel-service.js';
import { openTicket } from '../services/ticket-service.js';
import { reviewApplication, renderSemicircle } from '../lib/ai-review.js';
import { t } from '../lib/locales.js';
import { ADMIN_COMMANDS, isAuthorizedForAdmin, isOwner } from '../services/authorization.js';

const parseJson = (text, fallback = {}) => { try { return text?.trim() ? JSON.parse(text) : fallback; } catch { return null; } };
const canModerate = (member, panel) => member.permissions.has(PermissionFlagsBits.ManageChannels) || (panel.config.staffRoleIds ?? []).some((id) => member.roles.cache.has(id));

export default async function handleInteraction(interaction, context) {
  const { db, client } = context;
  if (interaction.isChatInputCommand()) {
    if (ADMIN_COMMANDS.has(interaction.commandName)) {
      if (!isAuthorizedForAdmin(interaction, db)) return interaction.reply({ content: 'You are not authorized to use ticket administration commands.', ephemeral: true });
      if (['grantrole', 'revokerole'].includes(interaction.commandName) && !isOwner(interaction.user.id)) return interaction.reply({ content: 'Only the bot owner can authorize or revoke roles.', ephemeral: true });
    }
    const command = client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction, context);
    return;
  }
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'panel:create') {
      const staffRoleIds = interaction.fields.getTextInputValue('staffRoles').split(',').map((id) => id.trim()).filter((id) => /^\d{15,22}$/.test(id));
      const panel = createPanel(db, { guildId: interaction.guildId, name: interaction.fields.getTextInputValue('name').trim(), description: interaction.fields.getTextInputValue('description').trim(), createdBy: interaction.user.id, config: { staffRoleIds, languages: ['en'], topics: [], rolesMentionedOnOpen: [], aiDetector: true, modChat: true } });
      await interaction.reply({ content: `Panel draft created. ID: \`${panel.id}\`. Add topics with /addtopic, adjust options with /configurepanel, and publish only when ready with /publishpanel. Nothing was posted to a channel.`, ephemeral: true });
      return;
    }
    if (interaction.customId.startsWith('topic:add:')) {
      const panelId = interaction.customId.split(':')[2];
      const fields = parseJson(interaction.fields.getTextInputValue('fields'), []);
      const options = parseJson(interaction.fields.getTextInputValue('options'), {});
      if (!Array.isArray(fields) || fields.length > 5 || fields.some((field) => !field.label || (field.minLength ?? 0) < 0 || (field.maxLength ?? 1000) > 4000 || (field.minLength ?? 0) > (field.maxLength ?? 1000)) || !options || Array.isArray(options)) return interaction.reply({ content: 'Invalid topic JSON. Use up to five fields with label, required, minLength, and maxLength. Check options JSON too.', ephemeral: true });
      addTopic(db, panelId, { name: interaction.fields.getTextInputValue('name').trim(), fields, ...options });
      await interaction.reply({ content: 'Topic added to the panel draft.', ephemeral: true });
      return;
    }
    if (interaction.customId.startsWith('panel:configure:')) {
      const panelId = interaction.customId.split(':')[2];
      const panel = getPanel(db, panelId);
      const config = parseJson(interaction.fields.getTextInputValue('config'));
      if (!panel || panel.guild_id !== interaction.guildId || !config || Array.isArray(config)) return interaction.reply({ content: 'Invalid configuration JSON or panel.', ephemeral: true });
      const ids = [...(config.staffRoleIds ?? []), ...(config.rolesMentionedOnOpen ?? []), ...(config.modChatRoleIds ?? [])];
      if (ids.some((id) => !/^\d{15,22}$/.test(String(id)))) return interaction.reply({ content: 'Role IDs must be Discord snowflake IDs.', ephemeral: true });
      if (config.languages && (!Array.isArray(config.languages) || config.languages.some((lang) => !['en', 'pl', 'de', 'es', 'fr'].includes(lang)))) return interaction.reply({ content: 'Supported languages: en, pl, de, es, fr.', ephemeral: true });
      if ((config.topics ?? []).length > 25) return interaction.reply({ content: 'A panel can have at most 25 selectable topics.', ephemeral: true });
      if ((config.topics ?? []).some((topic) => !Array.isArray(topic.fields) || topic.fields.length > 5)) return interaction.reply({ content: 'Each topic may have at most five modal fields.', ephemeral: true });
      updatePanelConfig(db, panelId, config);
      await interaction.reply({ content: 'Panel draft configuration saved.', ephemeral: true });
      return;
    }
    if (interaction.customId.startsWith('ticket:form:')) {
      const [, , panelId, topicId, language, priority] = interaction.customId.split(':');
      const panel = getPanel(db, panelId);
      const topic = panel?.config.topics?.find((item) => item.id === topicId && item.enabled !== false);
      if (!panel || !topic) return interaction.reply({ content: 'This ticket form is no longer available.', ephemeral: true });
      const answers = {};
      for (let i = 0; i < topic.fields.length; i++) {
        const field = topic.fields[i];
        const value = interaction.fields.getTextInputValue(`field_${i}`).trim();
        if ((field.required && !value) || value.length < (field.minLength ?? 0) || value.length > (field.maxLength ?? 1000)) return interaction.reply({ content: `Check “${field.label}”: it must contain ${field.minLength ?? 0}–${field.maxLength ?? 1000} characters.`, ephemeral: true });
        if (value) answers[field.label] = value;
      }
      const channel = await openTicket({ db, interaction, panel, topic, answers, language, priority: Number(priority) || 3 });
      await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
      return;
    }
  }
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
  const parts = interaction.customId.split(':');
  if (parts[0] === 'panel' && interaction.isButton()) {
    const panel = getPanel(db, parts[2]);
    if (!panel || panel.guild_id !== interaction.guildId) return interaction.reply({ content: 'Panel not found.', ephemeral: true });
    const topics = (panel.config.topics ?? []).filter((topic) => topic.enabled !== false);
    if (!topics.length) return interaction.reply({ content: t('en', 'noTopics'), ephemeral: true });
    const topicMenu = new StringSelectMenuBuilder().setCustomId(`wizard:topic:${panel.id}`).setPlaceholder('Choose a ticket topic').addOptions(topics.slice(0, 25).map((topic) => ({ label: topic.name.slice(0, 100), value: topic.id, description: (topic.description ?? 'Open a ticket for this topic').slice(0, 100) })));
    const langMenu = new StringSelectMenuBuilder().setCustomId(`wizard:language:${panel.id}`).setPlaceholder('Choose a language').addOptions((panel.config.languages ?? ['en']).filter((lang) => ['en','pl','de','es','fr'].includes(lang)).map((lang) => ({ label: ({en:'English',pl:'Polski',de:'Deutsch',es:'Español',fr:'Français'})[lang], value: lang })));
    const priorityMenu = new StringSelectMenuBuilder().setCustomId(`wizard:priority:${panel.id}`).setPlaceholder('Choose a priority').addOptions(['Turtle 🐢','Low 🟢','Standard ⚪','High 🔴','World-collapsing ☄️'].map((label, i) => ({ label, value: String(i + 1) })));
    const next = new ButtonBuilder().setCustomId(`wizard:next:${panel.id}`).setLabel('Continue').setStyle(ButtonStyle.Primary);
    client.wizards.set(interaction.user.id, { panelId: panel.id, language: panel.config.defaultLanguage ?? 'en', priority: 3 });
    await interaction.reply({ content: 'Choose a topic, language, and priority before opening the ticket.', components: [new ActionRowBuilder().addComponents(topicMenu), new ActionRowBuilder().addComponents(langMenu), new ActionRowBuilder().addComponents(priorityMenu), new ActionRowBuilder().addComponents(next)], ephemeral: true });
    return;
  }
  if (parts[0] === 'wizard') {
    const state = client.wizards.get(interaction.user.id);
    const panel = state && getPanel(db, state.panelId);
    if (!panel || panel.id !== parts[2]) return interaction.reply({ content: 'Start again from the panel button.', ephemeral: true });
    if (interaction.isStringSelectMenu()) {
      if (parts[1] === 'topic') state.topicId = interaction.values[0];
      if (parts[1] === 'language') {
        const allowed = panel.config.languages ?? ['en'];
        const topic = panel.config.topics.find((item) => item.id === state.topicId);
        const choices = topic?.languages ?? allowed;
        if (!choices.includes(interaction.values[0])) return interaction.reply({ content: 'That language is disabled for this topic.', ephemeral: true });
        state.language = interaction.values[0];
      }
      if (parts[1] === 'priority') state.priority = Number(interaction.values[0]);
      client.wizards.set(interaction.user.id, state);
      return interaction.deferUpdate();
    }
    if (parts[1] === 'next') {
      const topic = panel.config.topics.find((item) => item.id === state.topicId && item.enabled !== false);
      if (!topic) return interaction.reply({ content: 'Choose a topic first.', ephemeral: true });
      const fields = topic.fields ?? [];
      if (fields.length > 5) return interaction.reply({ content: 'This topic exceeds Discord’s five-field form limit.', ephemeral: true });
      if (!fields.length) {
        const channel = await openTicket({ db, interaction, panel, topic, answers: {}, language: state.language, priority: state.priority });
        client.wizards.delete(interaction.user.id);
        return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
      }
      const modal = new ModalBuilder().setCustomId(`ticket:form:${panel.id}:${topic.id}:${state.language}:${state.priority}`).setTitle((topic.formTitle || 'Ticket details').slice(0, 45));
      modal.addComponents(...fields.map((field, i) => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`field_${i}`).setLabel(field.label.slice(0, 45)).setStyle(field.style === 'short' ? TextInputStyle.Short : TextInputStyle.Paragraph).setMinLength(field.minLength ?? 0).setMaxLength(field.maxLength ?? 1000).setRequired(Boolean(field.required)))));
      await interaction.showModal(modal);
    }
    return;
  }
  if (parts[0] === 'ticket') {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND guild_id = ?').get(parts[2], interaction.guildId);
    if (!ticket) return interaction.reply({ content: 'Ticket record not found.', ephemeral: true });
    const panel = getPanel(db, ticket.panel_id);
    if (parts[1] !== 'priority' && !canModerate(interaction.member, panel) && interaction.user.id !== ticket.opener_id) return interaction.reply({ content: 'You cannot use this ticket control.', ephemeral: true });
    if (parts[1] === 'close') {
      if (interaction.user.id !== ticket.opener_id && !canModerate(interaction.member, panel)) return interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', ephemeral: true });
      db.prepare("UPDATE tickets SET status='closed', closed_at=CURRENT_TIMESTAMP WHERE id=?").run(ticket.id);
      await interaction.channel.permissionOverwrites.edit(ticket.opener_id, { SendMessages: false });
      await interaction.reply({ content: t(ticket.language, 'closed') });
      return;
    }
    if (parts[1] === 'claim') {
      if (!canModerate(interaction.member, panel)) return interaction.reply({ content: 'Staff only.', ephemeral: true });
      db.prepare('UPDATE tickets SET claimed_by=? WHERE id=?').run(interaction.user.id, ticket.id);
      return interaction.reply({ content: t(ticket.language, 'claimed', { user: interaction.user }) });
    }
    if (parts[1] === 'ai') {
      if (!canModerate(interaction.member, panel)) return interaction.reply({ content: 'Staff only.', ephemeral: true });
      if (panel.config.aiDetector === false || panel.config.topics.find((item) => item.id === ticket.topic_id)?.aiDetector === false) return interaction.reply({ content: 'Text pattern review is disabled for this topic.', ephemeral: true });
      const answers = JSON.parse(ticket.submission_json || '{}');
      const result = reviewApplication(answers);
      const fieldSummary = result.fieldReviews.map((field) => `• ${field.label}: ${field.score == null ? 'insufficient text' : `pattern index ${field.score}/100`} — ${field.reasons.join(' ')}`).join('\n');
      const patternText = result.patternScore == null ? 'Text pattern indicator: insufficient text (30-word minimum per field).' : `Text pattern indicator: ${result.patternScore}/100. This is not an AI probability or proof of authorship.\n\n${renderSemicircle(result.patternScore)}`;
      const embed = new EmbedBuilder().setTitle(t(ticket.language, 'reviewTitle')).setDescription(`Application completeness score: ${result.applicationScore}/100 (a basic completeness heuristic, not an AI assessment).\n\n${patternText}\n\n${result.reasons.map((reason) => `• ${reason}`).join('\n')}\n\nPer-field review:\n${fieldSummary || 'No form answers to review.'}\n\nDo not use these indicators alone to judge or reject an applicant.`).setColor(0x5865f2);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (parts[1] === 'priority') {
      const menu = new StringSelectMenuBuilder().setCustomId(`ticketpriority:${ticket.id}`).setPlaceholder('Choose priority').addOptions(['Turtle 🐢','Low 🟢','Standard ⚪','High 🔴','World-collapsing ☄️'].map((label, i) => ({ label, value: String(i + 1) })));
      return interaction.reply({ content: 'Select a priority:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
    }
    if (parts[1] === 'modchat') {
      if (!canModerate(interaction.member, panel)) return interaction.reply({ content: 'Staff only.', ephemeral: true });
      if (panel.config.modChat === false || panel.config.topics.find((item) => item.id === ticket.topic_id)?.modChat === false) return interaction.reply({ content: 'Mod Chat is disabled for this topic.', ephemeral: true });
      const roleIds = panel.config.modChatRoleIds ?? panel.config.staffRoleIds ?? [];
      const members = await interaction.guild.members.fetch();
      const thread = await interaction.channel.threads.create({ name: 'moderation-only', type: 12, invitable: false, autoArchiveDuration: ThreadAutoArchiveDuration.OneDay, reason: 'Private moderator discussion' });
      const selected = [...new Set(members.filter((member) => roleIds.some((id) => member.roles.cache.has(id))).map((member) => member.id))].slice(0, 50);
      for (const userId of selected) await thread.members.add(userId).catch(() => null);
      await interaction.reply({ content: `Private moderation thread created: ${thread}`, ephemeral: true });
      return;
    }
  }
  if (interaction.isStringSelectMenu() && parts[0] === 'ticketpriority') {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id=?').get(parts[1]);
    if (!ticket) return interaction.reply({ content: 'Ticket not found.', ephemeral: true });
    if (ticket.guild_id !== interaction.guildId) return interaction.reply({ content: 'Ticket not found in this server.', ephemeral: true });
    const priority = Number(interaction.values[0]);
    db.prepare('UPDATE tickets SET priority=? WHERE id=?').run(priority, ticket.id);
    const label = ['Turtle 🐢','Low 🟢','Standard ⚪','High 🔴','World-collapsing ☄️'][priority - 1];
    const channel = await interaction.guild.channels.fetch(ticket.channel_id).catch(() => null);
    if (channel?.isTextBased()) {
      const messages = await channel.messages.fetch({ limit: 25 }).catch(() => null);
      const ticketMessage = messages?.find((message) => message.components.some((row) => row.components.some((component) => component.customId === `ticket:priority:${ticket.id}`)));
      if (ticketMessage) {
        const content = ticketMessage.content.replace(/^\*\*Priority:\*\*.*(?:\r?\n)?/m, '').trim();
        await ticketMessage.edit({ content: [content, `**Priority:** ${label}`].filter(Boolean).join('\n') });
      }
    }
    return interaction.update({ content: `Priority updated: ${label}`, components: [] });
  }
}
