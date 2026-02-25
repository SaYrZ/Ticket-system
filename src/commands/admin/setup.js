const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Set up the ticket panel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the panel to')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(client, interaction) {
        const channel = interaction.options.getChannel('channel');
        const config = client.config;

        // Create panel embed
        const panelEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Ticket Support System')
            .setDescription('Create a ticket to get help from our support team.')
            .addFields(
                { name: 'How to create a ticket', value: 'Select a category from the dropdown below and click "Create Ticket".' },
                { name: 'Categories', value: '- Support: General support questions\n- General: General inquiries\n- Billing: Billing related issues\n- Report: Report problems or violations' }
            )
            .setImage('https://i.imgur.com/ybwuWJH.png')
            .setTimestamp()
            .setFooter({ text: 'Ticket System v2' });

        // Create select menu for categories
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('select_ticket_category')
            .setPlaceholder('Select a category')
            .addOptions(
                {
                    label: 'Support',
                    description: 'Get help with technical issues',
                    value: 'support'
                },
                {
                    label: 'General',
                    description: 'General inquiries',
                    value: 'general'
                },
                {
                    label: 'Billing',
                    description: 'Billing and payment questions',
                    value: 'billing'
                },
                {
                    label: 'Report',
                    description: 'Report issues or violations',
                    value: 'report'
                }
            );

        // Create button row
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket_support')
                    .setLabel('Create Support Ticket')
                    .setStyle(ButtonStyle.Primary)
            );

        // Create select menu row
        const selectRow = new ActionRowBuilder()
            .addComponents(categorySelect);

        // Send panel to channel
        await channel.send({ embeds: [panelEmbed], components: [selectRow, buttonRow] });

        // Send confirmation
        const confirmEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Setup Complete')
            .setDescription(`Ticket panel has been sent to ${channel.toString()}`);

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }
};
