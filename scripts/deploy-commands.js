import { REST, Routes } from 'discord.js';
import { config } from '../src/config.js';
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const commands = [];
for (const file of await readdir(join(root, '../src/commands'))) {
  if (!file.endsWith('.js')) continue;
  const command = (await import(pathToFileURL(join(root, '../src/commands', file)))).default;
  commands.push(command.data.toJSON());
}
const rest = new REST({ version: '10' }).setToken(config.token);
if (config.guildId) await rest.put(Routes.applicationGuildCommands((await rest.get(Routes.oauth2CurrentApplication())).id, config.guildId), { body: commands });
else {
  const app = await rest.get(Routes.oauth2CurrentApplication());
  await rest.put(Routes.applicationCommands(app.id), { body: commands });
}
console.log(`Registered ${commands.length} slash commands.`);
