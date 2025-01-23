import { InteractionContextType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('create-drive')
    .setDescription('Create a new shared drive')
    .addStringOption(option => option 
        .setName('name')
        .setDescription('Name of the shared drive')
        .setMinLength(5)
        .setMaxLength(42)
        .setRequired(true)
    )
    .addStringOption(option => option
        .setName('email')
        .setDescription('Google email to add as owner of the shared drive')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setContexts(InteractionContextType.Guild)
];

const { TOKEN, CLIENT_ID } = process.env;
if (!TOKEN || !CLIENT_ID) throw new Error('Discord client id or token missing!');

const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
  console.log('Started refreshing application (/) commands.');

  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}