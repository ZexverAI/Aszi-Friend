import { randomUUID } from 'node:crypto';
import { TICKET_TOPICS } from './ticket-topics.js';

const DEFAULT_LANGUAGES = ['en', 'pl', 'de', 'es', 'fr'];
const DEFAULT_CONFIG = {
  staffRoleIds: [],
  rolesMentionedOnOpen: [],
  modChatRoleIds: [],
  languages: DEFAULT_LANGUAGES,
  defaultLanguage: 'en',
  aiDetector: true,
  modChat: true,
  topics: TICKET_TOPICS.map((topic) => ({ ...topic, fields: topic.fields.map((field) => ({ ...field })) , enabled: true, languages: null, modChat: true })),
};

export function createPanel(db, { guildId, name, description = '', createdBy, config = {} }) {
  const id = randomUUID().slice(0, 8);
  db.prepare('INSERT INTO panels (id, guild_id, name, description, config_json, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, guildId, name, description, JSON.stringify(config), createdBy);
  return getPanel(db, id);
}
export function getPanel(db, id) {
  const row = db.prepare('SELECT * FROM panels WHERE id = ?').get(id);
  return row ? { ...row, config: JSON.parse(row.config_json) } : null;
}
export function updatePanelConfig(db, id, config) {
  db.prepare('UPDATE panels SET config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(config), id);
  return getPanel(db, id);
}
export function getOrCreateTicketPanel(db, guildId, createdBy) {
  let panel = db.prepare('SELECT * FROM panels WHERE guild_id = ? AND name = ? ORDER BY created_at LIMIT 1').get(guildId, 'Aszi Friend Tickets');
  if (!panel) return createPanel(db, { guildId, name: 'Aszi Friend Tickets', description: 'Aszi Friend ticket panel', createdBy, config: DEFAULT_CONFIG });
  const result = { ...panel, config: { ...DEFAULT_CONFIG, ...JSON.parse(panel.config_json) } };
  const existing = new Map((result.config.topics ?? []).map((topic) => [topic.id, topic]));
  result.config.topics = DEFAULT_CONFIG.topics.map((topic) => ({ ...topic, ...(existing.get(topic.id) ?? {}) }));
  updatePanelConfig(db, result.id, result.config);
  return getPanel(db, result.id);
}
export function setTopicAvailability(db, guildId, topicId, enabled, userId) {
  const panel = getOrCreateTicketPanel(db, guildId, userId);
  const topic = panel.config.topics.find((item) => item.id === topicId);
  if (!topic) throw new Error('Unknown topic.');
  topic.enabled = enabled;
  updatePanelConfig(db, panel.id, panel.config);
  return topic;
}
