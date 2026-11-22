import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import { config } from './config.js';
import { openDatabase } from './database/index.js';
import { loadCommands } from './handlers/load-commands.js';
import handleInteraction from './events/interaction-create.js';

const db = openDatabase(config.databasePath);
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();
client.wizards = new Map();
await loadCommands(client);
client.once(Events.ClientReady, (readyClient) => console.log(`Ready as ${readyClient.user.tag}`));
client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, { db, client }).catch(async (error) => {
  console.error('Interaction failed:', error);
  const payload = { content: 'Something went wrong. Please try again or contact a moderator.', ephemeral: true };
  if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => null);
  else await interaction.reply(payload).catch(() => null);
}));
process.on('SIGINT', () => { db.close(); client.destroy(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); client.destroy(); process.exit(0); });
await client.login(config.token);
