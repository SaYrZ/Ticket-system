const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new ticket')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Ticket category')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Support', value: 'support' },
                            { name: 'General', value: 'general' },
                            { name: 'Billing', value: 'billing' },
                            { name: 'Report', value: 'report' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close your ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get info about your tickets')),
    
    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();
        const config = client.config;

        if (subcommand === 'create') {
            // This will be handled by the button interaction
            // Just acknowledge and let user know
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('Create Ticket')
                .setDescription('Please use the ticket panel in the designated channel to create a ticket, or use the dropdown menu to select a category.');

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'close') {
            const ticketsData = client.loadData('tickets.json');
            const userTicket = ticketsData.tickets.find(t => t.userId === interaction.user.id && !t.closed);

            if (!userTicket) {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('No Open Ticket')
                    .setDescription('You do not have any open tickets.');

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const channel = interaction.guild.channels.cache.get(userTicket.channelId);
            if (channel) {
                // Send close confirmation
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xffaa00)
                    .setTitle('Close Ticket')
                    .setDescription('Are you sure you want to close this ticket?');

                const confirmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('confirm_close')
                            .setLabel('Yes, Close Ticket')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('cancel_close')
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], ephemeral: true });
            }
        }

        if (subcommand === 'info') {
            const ticketsData = client.loadData('tickets.json');
            const userTickets = ticketsData.tickets.filter(t => t.userId === interaction.user.id);
            const openTickets = userTickets.filter(t => !t.closed);
            const closedTickets = userTickets.filter(t => t.closed);

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('Your Tickets')
                .addFields(
                    { name: 'Open Tickets', value: openTickets.length.toString(), inline: true },
                    { name: 'Closed Tickets', value: closedTickets.length.toString(), inline: true },
                    { name: 'Total Tickets', value: userTickets.length.toString(), inline: true }
                );

            if (openTickets.length > 0) {
                const openList = openTickets.map(t => `#${t.id} - ${t.category}`).join('\n');
                embed.addFields({ name: 'Open Ticket IDs', value: openList });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
