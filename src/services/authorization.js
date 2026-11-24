export const BOT_OWNER_ID = '1191814686644117537';
export const ADMIN_COMMANDS = new Set([
  'sentpanel',
  'announce',
  'closetopic',
  'opentopic',
  'addlanguage',
  'removelanguage',
  'grantrole',
  'revokerole',
]);

export function isOwner(userId) {
  return userId === BOT_OWNER_ID;
}

export function isAuthorizedForAdmin(interaction, db) {
  if (isOwner(interaction.user.id)) return true;
  if (!interaction.guildId || !interaction.member?.roles?.cache) return false;
  const rows = db.prepare('SELECT role_id FROM authorized_admin_roles WHERE guild_id = ?').all(interaction.guildId);
  return rows.some(({ role_id }) => interaction.member.roles.cache.has(role_id));
}

export function grantAdminRole(db, guildId, roleId, grantedBy) {
  db.prepare('INSERT OR IGNORE INTO authorized_admin_roles (guild_id, role_id, granted_by) VALUES (?, ?, ?)')
    .run(guildId, roleId, grantedBy);
}

export function revokeAdminRole(db, guildId, roleId) {
  return db.prepare('DELETE FROM authorized_admin_roles WHERE guild_id = ? AND role_id = ?').run(guildId, roleId).changes > 0;
}

export function listAdminRoles(db, guildId) {
  return db.prepare('SELECT role_id FROM authorized_admin_roles WHERE guild_id = ? ORDER BY role_id').all(guildId).map(({ role_id }) => role_id);
}
