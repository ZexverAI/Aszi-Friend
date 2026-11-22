import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

export async function loadCommands(client) {
  const directory = new URL('../commands/', import.meta.url);
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.js')) continue;
    const command = (await import(pathToFileURL(join(directory.pathname, file)))).default;
    client.commands.set(command.data.name, command);
  }
}
