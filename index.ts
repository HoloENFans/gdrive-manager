import { Client, EmbedBuilder, Events, MessageFlags, WebhookClient } from 'discord.js';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const { TOKEN, LOG_WEBHOOK_URL, GOOGLE_IMPERSONATE_EMAIL } = process.env;
if (!TOKEN) throw new Error('Discord token missing!');
if (!LOG_WEBHOOK_URL) throw new Error('Log webhook url missing!');
if (!GOOGLE_IMPERSONATE_EMAIL) throw new Error('Google impersonation missing!');

const client = new Client({ intents: [] });

const googleClient = new JWT({
    keyFile: './google.json',
    scopes: ['https://www.googleapis.com/auth/drive'],
    subject: GOOGLE_IMPERSONATE_EMAIL,
});

const webhookLogClient = new WebhookClient({ url: LOG_WEBHOOK_URL });

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.inGuild() || !interaction.isCommand()) return;

    if (interaction.commandName === 'create-drive') {
        const name = interaction.options.get('name', true).value! as string;
        const email = interaction.options.get('email', true).value! as string;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const driveApi = google.drive({ version: 'v3', auth: googleClient });

        try {
            const drive = await driveApi.teamdrives.create({ requestBody: { name }, requestId: interaction.id });
            if (!drive.data.id) throw new Error('No id for newly created team drive!');

            const permissions = await driveApi.permissions.list({ fileId: drive.data.id, supportsAllDrives: true });
            await driveApi.permissions.create({
                requestBody: {
                    type: 'user',
                    role: 'organizer',
                    emailAddress: email,
                },
                fileId: drive.data.id,
                fields: 'id',
                supportsAllDrives: true,
            });
            await driveApi.permissions.delete({ fileId: drive.data.id, permissionId: permissions.data.permissions![0].id!, supportsAllDrives: true })
            
            await interaction.editReply(`Drive \`${name}\` has been created! [link](<https://drive.google.com/drive/u/0/folders/${drive.data.id}>)`);

            const logEmbed = new EmbedBuilder()
                .setTitle(`New drive created: ${name}`)
                .setURL(`https://drive.google.com/drive/u/0/folders/${drive.data.id}`)
                .setDescription(`Created by: ${interaction.user.username}`)
                .setFooter({ text: interaction.user.id })
                .setTimestamp();

            await webhookLogClient.send({ embeds: [logEmbed] });
        } catch (err) {
            console.error(err);
            await interaction.editReply('Something went wrong, please try again!')
        }
    }
});

client.login(TOKEN);