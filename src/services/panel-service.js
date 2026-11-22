import { randomUUID } from 'node:crypto';

export function createPanel(db, { guildId, name, description, createdBy, config = {} }) {
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
  db.prepare('UPDATE panels SET config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(JSON.stringify(config), id);
  return getPanel(db, id);
}

export function listPanels(db, guildId) {
  return db.prepare('SELECT id, name, description, created_at FROM panels WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
}

export function addTopic(db, id, topic) {
  const panel = getPanel(db, id);
  if (!panel) throw new Error('Panel not found.');
  panel.config.topics ??= [];
  panel.config.topics.push({ id: randomUUID().slice(0, 8), enabled: true, aiDetector: true, modChat: true, fields: [], languages: null, ...topic });
  return updatePanelConfig(db, id, panel.config);
}
