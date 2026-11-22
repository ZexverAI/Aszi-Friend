import { REST, Routes } from 'discord.js';

function normalizeOption(option) {
  const normalized = {};
  for (const key of ['type', 'name', 'description', 'min_value', 'max_value', 'min_length', 'max_length', 'autocomplete']) {
    if (option[key] !== undefined) normalized[key] = option[key];
  }
  normalized.required = Boolean(option.required);
  if (option.choices) normalized.choices = option.choices.map(({ name, value }) => ({ name, value }));
  if (option.channel_types) normalized.channel_types = [...option.channel_types].sort((a, b) => a - b);
  if (option.options) normalized.options = option.options.map(normalizeOption);
  return normalized;
}
function normalizeCommand(command) {
  return {
    name: command.name,
    description: command.description ?? '',
    type: command.type ?? 1,
    options: (command.options ?? []).map(normalizeOption),
  };
}
function sameCommands(actual, payload) {
  const normalize = (items) => items.map(normalizeCommand).sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(payload));
}

export function createCommandSynchronizer(client, token) {
  const rest = new REST({ version: '10' }).setToken(token);
  const payload = [...client.commands.values()].map((command) => command.data.toJSON());
  const inFlight = new Map();

  async function syncGlobal() {
    const route = Routes.applicationCommands(client.user.id);
    const current = await rest.get(route);
    if (!sameCommands(Array.isArray(current) ? current : [], payload)) {
      const updated = await rest.put(route, { body: payload });
      console.log(`[commands] Replaced global commands with ${updated.length} current commands.`);
    } else console.log(`[commands] Verified ${payload.length} global commands.`);
  }

  async function syncGuild(guild) {
    if (inFlight.has(guild.id)) return inFlight.get(guild.id);
    const work = (async () => {
      const route = Routes.applicationGuildCommands(client.user.id, guild.id);
      const current = await rest.get(route);
      if (!sameCommands(Array.isArray(current) ? current : [], payload)) {
        const updated = await rest.put(route, { body: payload });
        console.log(`[commands] Registered ${updated.length} commands for ${guild.name} (${guild.id}).`);
      } else console.log(`[commands] Verified ${payload.length} commands for ${guild.name} (${guild.id}).`);
    })();
    inFlight.set(guild.id, work);
    try { await work; } catch (error) { inFlight.delete(guild.id); throw error; }
  }

  async function syncAllGuilds() {
    try { await syncGlobal(); } catch (error) { console.error('[commands] Global command sync failed:', error); }
    const results = await Promise.allSettled([...client.guilds.cache.values()].map(syncGuild));
    for (const result of results) if (result.status === 'rejected') console.error('[commands] Guild command sync failed:', result.reason);
  }

  return { syncGuild, syncAllGuilds };
}
