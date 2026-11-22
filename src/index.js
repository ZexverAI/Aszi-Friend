import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import { config } from './config.js';
import { openDatabase } from './database/index.js';
import { loadCommands } from './handlers/load-commands.js';
import handleInteraction from './events/interaction-create.js';
import { createCommandSynchronizer } from './services/command-sync.js';

const db = openDatabase(config.databasePath);
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();
client.wizards = new Map();
await loadCommands(client);
const commandSync = createCommandSynchronizer(client, config.token);
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready as ${readyClient.user.tag}`);
  await commandSync.syncAllGuilds();
});
client.on(Events.GuildCreate, (guild) => commandSync.syncGuild(guild).catch((error) => console.error('[commands] New-server command sync failed:', error)));
client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, { db, client }).catch(async (error) => {
  console.error('Interaction failed:', error);
  const payload = { content: 'Something went wrong. Please try again or contact a moderator.', ephemeral: true };
  if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => null);
  else await interaction.reply(payload).catch(() => null);
}));
process.on('SIGINT', () => { db.close(); client.destroy(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); client.destroy(); process.exit(0); });
await client.login(config.token);
