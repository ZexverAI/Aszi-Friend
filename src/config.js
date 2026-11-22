import 'dotenv/config';

const required = ['DISCORD_TOKEN'];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Missing required environment variable: ${key}`);
}

export const config = Object.freeze({
  token: process.env.DISCORD_TOKEN.trim(),
  guildId: process.env.DISCORD_GUILD_ID?.trim() || null,
  databasePath: process.env.DATABASE_PATH?.trim() || './data/aszi-friend.sqlite',
});
