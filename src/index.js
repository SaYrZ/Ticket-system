const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create data directories
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data files
const initDataFile = (filename, defaultData = {}) => {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
    return filePath;
};

initDataFile('tickets.json', { tickets: [], counter: 0 });
initDataFile('ratings.json', { ratings: [] });
initDataFile('users.json', {});

// Load data
const loadData = (filename) => {
    const filePath = path.join(dataDir, filename);
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
};

const saveData = (filename, data) => {
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Configuration
const config = {
    maxTicketsPerUser: parseInt(process.env.MAX_TICKETS_PER_USER) || 3,
    ticketCategoryId: process.env.TICKET_CATEGORY_ID,
    ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID,
    supportRoleId: process.env.SUPPORT_ROLE_ID,
    adminRoleId: process.env.ADMIN_ROLE_ID,
    panelChannelId: process.env.PANEL_CHANNEL_ID,
    panelMessageId: process.env.PANEL_MESSAGE_ID,
    transcriptDmEnabled: process.env.TRANSCRIPT_DM_ENABLED === 'true',
    ratingEnabled: process.env.RATING_ENABLED === 'true',
    logAllMessages: process.env.LOG_ALL_MESSAGES === 'true',
    logTicketCreation: process.env.LOG_TICKET_CREATION === 'true',
    logTicketClose: process.env.LOG_TICKET_CLOSE === 'true',
    logTicketClaim: process.env.LOG_TICKET_CLAIM === 'true',
    logTicketRating: process.env.LOG_TICKET_RATING === 'true'
};

// Create client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

client.commands = new Collection();
client.config = config;
client.loadData = loadData;
client.saveData = saveData;

// Event handlers
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(__dirname, 'events', file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
    }
}

// Command handler
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', folder)).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const command = require(path.join(__dirname, 'commands', folder, file));
        client.commands.set(command.data.name, command);
    }
}

// Login
client.login(process.env.BOT_TOKEN);

module.exports = { client, config, loadData, saveData };
