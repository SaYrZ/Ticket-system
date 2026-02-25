const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(client, message) {
        // Ignore bots
        if (message.author.bot) return;

        // Check if it's a ticket channel
        const ticketsData = client.loadData('tickets.json');
        const config = client.config;
        
        const ticket = ticketsData.tickets.find(t => t.channelId === message.channel.id && !t.closed);
        
        if (!ticket) return;

        // Log message if enabled
        if (config.logAllMessages) {
            // Store message in ticket data
            const messageData = {
                id: message.id,
                author: message.author.username,
                authorId: message.author.id,
                content: message.content,
                timestamp: message.createdAt.toISOString(),
                attachments: message.attachments.map(a => a.url)
            };

            if (!ticket.messages) ticket.messages = [];
            ticket.messages.push(messageData);
            client.saveData('tickets.json', ticketsData);

            // Send to log channel
            if (config.ticketLogChannelId) {
                const logChannel = message.guild.channels.cache.get(config.ticketLogChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0x00ffff)
                        .setTitle(`Message in Ticket #${ticket.id}`)
                        .addFields(
                            { name: 'Author', value: message.author.username, inline: true },
                            { name: 'Content', value: message.content.substring(0, 1000) }
                        )
                        .setTimestamp();

                    if (message.attachments.size > 0) {
                        logEmbed.addFields({
                            name: 'Attachments',
                            value: message.attachments.map(a => a.url).join('\n'),
                            inline: false
                        });
                    }

                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        }
    }
};
