const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[SYSTEM] Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`[SYSTEM] Serving ${client.guilds.cache.size} servers`);
        
        // Set bot status
        client.user.setPresence({
            activities: [{
                name: 'Ticket System',
                type: 0
            }],
            status: 'online'
        });

        // Initialize ticket counter if not exists
        const data = client.loadData('tickets.json');
        if (!data || !data.counter) {
            client.saveData('tickets.json', { tickets: [], counter: 0 });
        }

        console.log(`[SYSTEM] Ticket counter initialized: ${data?.counter || 0}`);
    }
};
