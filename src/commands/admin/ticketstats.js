const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Ticket management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View ticket statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all open tickets'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get info about a specific ticket')
                .addIntegerOption(option =>
                    option.setName('ticketid')
                        .setDescription('Ticket ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ratings')
                .setDescription('View all ratings'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();
        const config = client.config;

        if (subcommand === 'stats') {
            const ticketsData = client.loadData('tickets.json');
            const ratingsData = client.loadData('ratings.json');

            const totalTickets = ticketsData.tickets.length;
            const openTickets = ticketsData.tickets.filter(t => !t.closed).length;
            const closedTickets = ticketsData.tickets.filter(t => t.closed).length;

            // Calculate average rating
            const ratings = ratingsData.ratings;
            const avgRating = ratings.length > 0 
                ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
                : 'N/A';

            // Category breakdown
            const categories = {};
            ticketsData.tickets.forEach(t => {
                categories[t.category] = (categories[t.category] || 0) + 1;
            });

            const categoryList = Object.entries(categories)
                .map(([cat, count]) => `${cat}: ${count}`)
                .join('\n') || 'No tickets';

            // Staff ratings
            const staffRatings = {};
            ratings.forEach(r => {
                if (r.claimedByName) {
                    if (!staffRatings[r.claimedByName]) {
                        staffRatings[r.claimedByName] = { total: 0, count: 0 };
                    }
                    staffRatings[r.claimedByName].total += r.rating;
                    staffRatings[r.claimedByName].count++;
                }
            });

            const staffList = Object.entries(staffRatings)
                .map(([staff, data]) => `${staff}: ${(data.total / data.count).toFixed(1)}/5 (${data.count} ratings)`)
                .join('\n') || 'No ratings yet';

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('Ticket Statistics')
                .addFields(
                    { name: 'Total Tickets', value: totalTickets.toString(), inline: true },
                    { name: 'Open Tickets', value: openTickets.toString(), inline: true },
                    { name: 'Closed Tickets', value: closedTickets.toString(), inline: true },
                    { name: 'Average Rating', value: `${avgRating}/5`, inline: true },
                    { name: 'Categories', value: categoryList },
                    { name: 'Staff Ratings', value: staffList }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'list') {
            const ticketsData = client.loadData('tickets.json');
            const openTickets = ticketsData.tickets.filter(t => !t.closed);

            if (openTickets.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('Open Tickets')
                    .setDescription('No open tickets at the moment.');

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const ticketList = openTickets.map(t => {
                const status = t.claimedBy ? `Claimed by ${t.claimedByName}` : 'Unclaimed';
                return `#${t.id} - ${t.category} - ${t.username} - ${status}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('Open Tickets')
                .setDescription(ticketList);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'info') {
            const ticketId = interaction.options.getInteger('ticketid');
            const ticketsData = client.loadData('tickets.json');

            const ticket = ticketsData.tickets.find(t => t.id === ticketId);

            if (!ticket) {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('Ticket Not Found')
                    .setDescription(`Ticket #${ticketId} not found.`);

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle(`Ticket #${ticket.id}`)
                .addFields(
                    { name: 'Category', value: ticket.category, inline: true },
                    { name: 'User', value: ticket.username, inline: true },
                    { name: 'Status', value: ticket.closed ? 'Closed' : 'Open', inline: true },
                    { name: 'Created', value: new Date(ticket.createdAt).toLocaleString(), inline: true }
                );

            if (ticket.claimedBy) {
                embed.addFields({ name: 'Claimed by', value: ticket.claimedByName, inline: true });
            }

            if (ticket.closed) {
                embed.addFields(
                    { name: 'Closed by', value: ticket.closedByName, inline: true },
                    { name: 'Closed at', value: new Date(ticket.closedAt).toLocaleString(), inline: true }
                );
            }

            // Get message count
            const messageCount = ticket.messages ? ticket.messages.length : 0;
            embed.addFields({ name: 'Messages', value: messageCount.toString(), inline: true });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'ratings') {
            const ratingsData = client.loadData('ratings.json');
            const ratings = ratingsData.ratings;

            if (ratings.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('Ratings')
                    .setDescription('No ratings yet.');

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            // Sort by most recent
            const sortedRatings = ratings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

            const ratingList = sortedRatings.map(r => {
                const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                return `#${r.ticketId} - ${r.username} - ${stars} (${r.rating}/5) - Staff: ${r.claimedByName || 'N/A'}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0xffd700)
                .setTitle('Recent Ratings')
                .setDescription(ratingList);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
