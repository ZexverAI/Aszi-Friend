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

export function createCommandSynchronizer(client, token) {
  const rest = new REST({ version: '10' }).setToken(token);
  const payload = [...client.commands.values()].map((command) => command.data.toJSON());
  const inFlight = new Map();

  async function syncGuild(guild) {
    if (inFlight.has(guild.id)) return inFlight.get(guild.id);
    const work = (async () => {
      const route = Routes.applicationGuildCommands(client.user.id, guild.id);
      const current = await rest.get(route);
      const actual = Array.isArray(current) ? current : [];
      const desiredSorted = payload.map(normalizeCommand).sort((a, b) => a.name.localeCompare(b.name));
      const actualSorted = actual.map(normalizeCommand).sort((a, b) => a.name.localeCompare(b.name));
      if (JSON.stringify(actualSorted) !== JSON.stringify(desiredSorted)) {
        const updated = await rest.put(route, { body: payload });
        console.log(`[commands] Registered ${updated.length} slash commands for ${guild.name} (${guild.id}).`);
      } else {
        console.log(`[commands] Verified ${payload.length} slash commands for ${guild.name} (${guild.id}).`);
      }
    })();
    inFlight.set(guild.id, work);
    try {
      await work;
    } catch (error) {
      inFlight.delete(guild.id);
      throw error;
    }
  }

  async function syncAllGuilds() {
    const results = await Promise.allSettled([...client.guilds.cache.values()].map(syncGuild));
    for (const result of results) {
      if (result.status === 'rejected') console.error('[commands] Guild command sync failed:', result.reason);
    }
  }

  return { syncGuild, syncAllGuilds };
}
