import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const { DISCORD_TOKEN, APPLICATION_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder()
    .setName('hangar')
    .setDescription('Show time until the next hangar opens'),
  new SlashCommandBuilder()
    .setName('hanger')
    .setDescription('Alias of /hangar (typo-friendly)')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function register() {
  if (!APPLICATION_ID || !GUILD_ID) {
    console.error('Missing APPLICATION_ID or GUILD_ID');
    return;
  }
  await rest.put(
    Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID),
    { body: commands }
  );
  console.log('Slash commands registered for guild', GUILD_ID);
}

register().catch(console.error);