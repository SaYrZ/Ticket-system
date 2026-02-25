const { Events, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    name: Events.InteractionCreate,
    async execute(client, interaction) {
        // Handle commands
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(client, interaction);
            } catch (error) {
                console.error('[ERROR] Command execution error:', error);
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('Error')
                    .setDescription('An error occurred while executing this command.');
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
            return;
        }

        // Handle button interactions
        if (interaction.isButton()) {
            await handleButton(client, interaction);
            return;
        }

        // Handle select menu interactions
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(client, interaction);
            return;
        }
    }
};

async function handleButton(client, interaction) {
    const customId = interaction.customId;
    const config = client.config;

    // Open ticket button
    if (customId.startsWith('open_ticket_')) {
        await openTicket(client, interaction, customId.replace('open_ticket_', ''));
        return;
    }

    // Close ticket button
    if (customId === 'close_ticket') {
        await closeTicket(client, interaction);
        return;
    }

    // Claim ticket button
    if (customId === 'claim_ticket') {
        await claimTicket(client, interaction);
        return;
    }

    // Release ticket button
    if (customId === 'release_ticket') {
        await releaseTicket(client, interaction);
        return;
    }

    // Rating buttons (1-5 stars)
    if (customId.startsWith('rate_')) {
        await handleRating(client, interaction, parseInt(customId.replace('rate_', '')));
        return;
    }

    // Edit rating button
    if (customId === 'edit_rating') {
        await showRatingOptions(client, interaction);
        return;
    }

    // Confirm close ticket
    if (customId === 'confirm_close') {
        await confirmCloseTicket(client, interaction);
        return;
    }

    // Cancel close ticket
    if (customId === 'cancel_close') {
        await interaction.message.delete().catch(() => {});
        await interaction.reply({ content: 'Ticket closure cancelled.', ephemeral: true });
        return;
    }
}

async function handleSelectMenu(client, interaction) {
    const customId = interaction.customId;

    // Ticket category selection
    if (customId === 'select_ticket_category') {
        const category = interaction.values[0];
        await openTicket(client, interaction, category);
        return;
    }
}

async function openTicket(client, interaction, category) {
    const config = client.config;
    const user = interaction.user;
    const guild = interaction.guild;

    // Check if user has reached max tickets
    const ticketsData = client.loadData('tickets.json');
    const userTickets = ticketsData.tickets.filter(t => t.userId === user.id && !t.closed);
    
    if (userTickets.length >= config.maxTicketsPerUser) {
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('Ticket Limit Reached')
            .setDescription(`You already have ${userTickets.length} open ticket(s). Please close an existing ticket before creating a new one.`);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // Get category name
    const categoryNames = {
        'support': 'Support',
        'general': 'General',
        'billing': 'Billing',
        'report': 'Report'
    };
    const categoryName = categoryNames[category] || 'Support';

    // Create ticket channel
    const ticketNumber = ticketsData.counter + 1;
    const channelName = `ticket-${ticketNumber}`;

    // Get ticket category
    const ticketCategory = guild.channels.cache.get(config.ticketCategoryId);
    if (!ticketCategory) {
        await interaction.reply({ content: 'Ticket category not configured. Please contact an administrator.', ephemeral: true });
        return;
    }

    // Create the ticket channel
    const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketCategory,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: ['ViewChannel']
            },
            {
                id: user.id,
                allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'ReadMessageHistory']
            },
            {
                id: config.supportRoleId,
                allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'ReadMessageHistory', 'ManageMessages']
            },
            {
                id: config.adminRoleId,
                allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'ReadMessageHistory', 'ManageMessages']
            }
        ]
    });

    // Save ticket data
    const newTicket = {
        id: ticketNumber,
        channelId: ticketChannel.id,
        userId: user.id,
        username: user.username,
        category: categoryName,
        createdAt: new Date().toISOString(),
        closed: false,
        closedBy: null,
        claimedBy: null,
        claimedAt: null,
        messages: []
    };

    ticketsData.counter = ticketNumber;
    ticketsData.tickets.push(newTicket);
    client.saveData('tickets.json', ticketsData);

    // Create ticket embed
    const ticketEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`Ticket #${ticketNumber} - ${categoryName}`)
        .setDescription(`Welcome ${user}, a staff member will be with you shortly.`)
        .addFields(
            { name: 'Category', value: categoryName, inline: true },
            { name: 'Created by', value: user.username, inline: true },
            { name: 'Status', value: 'Open', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Ticket ID: ${ticketNumber}` });

    // Create action buttons
    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('release_ticket')
                .setLabel('Release Ticket')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
        );

    // Send message to ticket channel
    await ticketChannel.send({ embeds: [ticketEmbed], components: [actionRow] });

    // Send confirmation to user
    const confirmEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Ticket Created')
        .setDescription(`Your ticket #${ticketNumber} has been created: ${ticketChannel.toString()}`);

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

    // Log ticket creation
    if (config.logTicketCreation) {
        await logTicketCreation(client, newTicket);
    }
}

async function closeTicket(client, interaction) {
    const config = client.config;
    const channel = interaction.channel;

    // Find the ticket
    const ticketsData = client.loadData('tickets.json');
    const ticket = ticketsData.tickets.find(t => t.channelId === channel.id);

    if (!ticket) {
        await interaction.reply({ content: 'This channel is not a ticket.', ephemeral: true });
        return;
    }

    if (ticket.closed) {
        await interaction.reply({ content: 'This ticket is already closed.', ephemeral: true });
        return;
    }

    // Show confirmation
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

async function confirmCloseTicket(client, interaction) {
    const config = client.config;
    const channel = interaction.channel;
    const user = interaction.user;

    // Find the ticket
    const ticketsData = client.loadData('tickets.json');
    const ticketIndex = ticketsData.tickets.findIndex(t => t.channelId === channel.id);
    
    if (ticketIndex === -1) {
        await interaction.reply({ content: 'Ticket not found.', ephemeral: true });
        return;
    }

    const ticket = ticketsData.tickets[ticketIndex];

    // Update ticket
    ticket.closed = true;
    ticket.closedAt = new Date().toISOString();
    ticket.closedBy = user.id;
    ticket.closedByName = user.username;

    client.saveData('tickets.json', ticketsData);

    // Send closing message
    const closeEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Ticket Closed')
        .setDescription(`This ticket has been closed by ${user.username}.`)
        .addFields(
            { name: 'Closed by', value: user.username, inline: true },
            { name: 'Claimed by', value: ticket.claimedBy || 'Not claimed', inline: true }
        )
        .setTimestamp();

    await interaction.message.edit({ embeds: [closeEmbed], components: [] });

    // Generate and send transcript
    await sendTranscript(client, ticket);

    // Send rating prompt
    if (config.ratingEnabled && ticket.claimedBy) {
        await sendRatingPrompt(client, ticket);
    }

    // Log ticket closure
    if (config.logTicketClose) {
        await logTicketClosure(client, ticket);
    }

    await interaction.reply({ content: 'Ticket has been closed.', ephemeral: true });
}

async function claimTicket(client, interaction) {
    const config = client.config;
    const channel = interaction.channel;
    const user = interaction.user;

    // Check if user has permission
    const member = interaction.member;
    const hasPermission = member.roles.cache.has(config.supportRoleId) || member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!hasPermission) {
        await interaction.reply({ content: 'You do not have permission to claim tickets.', ephemeral: true });
        return;
    }

    // Find the ticket
    const ticketsData = client.loadData('tickets.json');
    const ticketIndex = ticketsData.tickets.findIndex(t => t.channelId === channel.id);

    if (ticketIndex === -1) {
        await interaction.reply({ content: 'Ticket not found.', ephemeral: true });
        return;
    }

    const ticket = ticketsData.tickets[ticketIndex];

    if (ticket.claimedBy) {
        await interaction.reply({ content: 'This ticket is already claimed.', ephemeral: true });
        return;
    }

    // Update ticket
    ticket.claimedBy = user.id;
    ticket.claimedByName = user.username;
    ticket.claimedAt = new Date().toISOString();

    client.saveData('tickets.json', ticketsData);

    // Update embed
    const updatedEmbed = new EmbedBuilder(interaction.message.embeds[0])
        .setColor(0x00aa00)
        .addFields(
            { name: 'Category', value: ticket.category, inline: true },
            { name: 'Created by', value: ticket.username, inline: true },
            { name: 'Status', value: `Claimed by ${user.username}`, inline: true }
        );

    await interaction.message.edit({ embeds: [updatedEmbed] });

    const claimEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Ticket Claimed')
        .setDescription(`${user.username} has claimed this ticket.`);

    await interaction.reply({ embeds: [claimEmbed], ephemeral: true });

    // Log ticket claim
    if (config.logTicketClaim) {
        await logTicketClaim(client, ticket);
    }
}

async function releaseTicket(client, interaction) {
    const config = client.config;
    const channel = interaction.channel;
    const user = interaction.user;

    // Find the ticket
    const ticketsData = client.loadData('tickets.json');
    const ticketIndex = ticketsData.tickets.findIndex(t => t.channelId === channel.id);

    if (ticketIndex === -1) {
        await interaction.reply({ content: 'Ticket not found.', ephemeral: true });
        return;
    }

    const ticket = ticketsData.tickets[ticketIndex];

    if (!ticket.claimedBy) {
        await interaction.reply({ content: 'This ticket is not claimed.', ephemeral: true });
        return;
    }

    // Update ticket
    ticket.claimedBy = null;
    ticket.claimedByName = null;
    ticket.claimedAt = null;

    client.saveData('tickets.json', ticketsData);

    // Update embed
    const updatedEmbed = new EmbedBuilder(interaction.message.embeds[0])
        .setColor(0x00ff00)
        .addFields(
            { name: 'Category', value: ticket.category, inline: true },
            { name: 'Created by', value: ticket.username, inline: true },
            { name: 'Status', value: 'Open', inline: true }
        );

    await interaction.message.edit({ embeds: [updatedEmbed] });

    const releaseEmbed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('Ticket Released')
        .setDescription(`${user.username} has released this ticket.`);

    await interaction.reply({ embeds: [releaseEmbed], ephemeral: true });
}

async function handleRating(client, interaction, rating) {
    const config = client.config;
    const user = interaction.user;

    // Find the ticket for this user
    const ticketsData = client.loadData('tickets.json');
    const ratingsData = client.loadData('ratings.json');

    // Find recent closed ticket by this user that hasn't been rated
    const userClosedTickets = ticketsData.tickets
        .filter(t => t.userId === user.id && t.closed && t.claimedBy)
        .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));

    if (userClosedTickets.length === 0) {
        await interaction.reply({ content: 'No closed tickets found to rate.', ephemeral: true });
        return;
    }

    const ticket = userClosedTickets[0];

    // Check if already rated
    const existingRating = ratingsData.ratings.find(r => r.ticketId === ticket.id);
    if (existingRating && !existingRating.editable) {
        await interaction.reply({ content: 'You have already rated this ticket. Rating can only be edited once.', ephemeral: true });
        return;
    }

    // Save or update rating
    const newRating = {
        ticketId: ticket.id,
        userId: user.id,
        username: user.username,
        rating: rating,
        claimedBy: ticket.claimedBy,
        claimedByName: ticket.claimedByName,
        createdAt: new Date().toISOString(),
        editable: true
    };

    if (existingRating) {
        Object.assign(existingRating, newRating);
        existingRating.editedAt = new Date().toISOString();
    } else {
        ratingsData.ratings.push(newRating);
    }

    client.saveData('ratings.json', ratingsData);

    // Create stars string
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    const ratingEmbed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('Rating Submitted')
        .setDescription(`Thank you for your feedback!\n\n**Rating:** ${stars} (${rating}/5)\n**Staff:** ${ticket.claimedByName || 'Unknown'}`)
        .addFields(
            { name: 'Ticket ID', value: `#${ticket.id}`, inline: true }
        );

    const editRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('edit_rating')
                .setLabel('Edit Rating')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [ratingEmbed], components: [editRow], ephemeral: true });

    // Log rating
    if (config.logTicketRating) {
        await logTicketRating(client, newRating);
    }
}

async function showRatingOptions(client, interaction) {
    const user = interaction.user;
    
    const ratingsData = client.loadData('ratings.json');
    
    // Find editable rating
    const userRatings = ratingsData.ratings.filter(r => r.userId === user.id && r.editable);
    
    if (userRatings.length === 0) {
        await interaction.reply({ content: 'No ratings available to edit.', ephemeral: true });
        return;
    }

    // Show current rating and allow re-rating
    const currentRating = userRatings[0];
    const stars = '★'.repeat(currentRating.rating) + '☆'.repeat(5 - currentRating.rating);

    const ratingEmbed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('Edit Your Rating')
        .setDescription(`Current Rating: ${stars} (${currentRating.rating}/5)\n\nSelect a new rating below:`);

    const ratingRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('rate_1').setLabel('1').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_2').setLabel('2').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_3').setLabel('3').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_4').setLabel('4').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_5').setLabel('5').setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [ratingEmbed], components: [ratingRow], ephemeral: true });
}

async function sendTranscript(client, ticket) {
    const config = client.config;
    const guild = client.guilds.cache.first();
    
    if (!guild) return;

    // Get the ticket channel
    const channel = guild.channels.cache.get(ticket.channelId);
    if (!channel) return;

    // Fetch all messages
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Create transcript content
    let transcript = `=== TICKET TRANSCRIPT #${ticket.id} ===\n`;
    transcript += `Category: ${ticket.category}\n`;
    transcript += `User: ${ticket.username} (${ticket.userId})\n`;
    transcript += `Created: ${new Date(ticket.createdAt).toLocaleString()}\n`;
    transcript += `Closed: ${new Date(ticket.closedAt).toLocaleString()}\n`;
    transcript += `Closed by: ${ticket.closedByName}\n`;
    if (ticket.claimedBy) {
        transcript += `Claimed by: ${ticket.claimedByName}\n`;
    }
    transcript += `\n=== MESSAGES ===\n\n`;

    for (const msg of sortedMessages.values()) {
        const timestamp = msg.createdAt.toLocaleString();
        const content = msg.content || '[No text content]';
        const author = msg.author.username;
        transcript += `[${timestamp}] ${author}: ${content}\n`;
    }

    // Send transcript to log channel
    if (config.ticketLogChannelId) {
        const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(`Ticket #${ticket.id} Closed`)
                .addFields(
                    { name: 'User', value: ticket.username, inline: true },
                    { name: 'Category', value: ticket.category, inline: true },
                    { name: 'Closed by', value: ticket.closedByName, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
            
            // Send transcript as text file
            await logChannel.send({
                files: [{
                    attachment: Buffer.from(transcript, 'utf8'),
                    name: `ticket-${ticket.id}-transcript.txt`
                }]
            });
        }
    }

    // Send transcript to user DM
    if (config.transcriptDmEnabled) {
        try {
            const user = await client.users.fetch(ticket.userId);
            if (user) {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle(`Ticket #${ticket.id} - Transcript`)
                    .setDescription(`Your ticket has been closed. Here is the transcript:`)
                    .addFields(
                        { name: 'Category', value: ticket.category, inline: true },
                        { name: 'Closed by', value: ticket.closedByName, inline: true },
                        { name: 'Staff', value: ticket.claimedByName || 'Not claimed', inline: true }
                    )
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
                
                await user.send({
                    files: [{
                        attachment: Buffer.from(transcript, 'utf8'),
                        name: `ticket-${ticket.id}-transcript.txt`
                    }]
                });
            }
        } catch (error) {
            console.error('[ERROR] Failed to send DM:', error.message);
        }
    }
}

async function sendRatingPrompt(client, ticket) {
    const config = client.config;
    if (!config.ratingEnabled) return;

    try {
        const user = await client.users.fetch(ticket.userId);
        if (!user) return;

        const ratingEmbed = new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle('Rate Your Experience')
            .setDescription(`Your ticket #${ticket.id} has been closed.\n\nPlease rate your experience with the support staff:`);

        const ratingRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('rate_1').setLabel('1').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('rate_2').setLabel('2').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('rate_3').setLabel('3').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('rate_4').setLabel('4').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('rate_5').setLabel('5').setStyle(ButtonStyle.Secondary)
            );

        await user.send({ embeds: [ratingEmbed], components: [ratingRow] });
    } catch (error) {
        console.error('[ERROR] Failed to send rating prompt:', error.message);
    }
}

// Logging functions
async function logTicketCreation(client, ticket) {
    const config = client.config;
    const guild = client.guilds.cache.first();
    if (!guild || !config.ticketLogChannelId) return;

    const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Ticket Created')
        .addFields(
            { name: 'Ticket ID', value: `#${ticket.id}`, inline: true },
            { name: 'User', value: ticket.username, inline: true },
            { name: 'Category', value: ticket.category, inline: true }
        )
        .setTimestamp();

    await logChannel.send({ embeds: [embed] });
}

async function logTicketClosure(client, ticket) {
    const config = client.config;
    const guild = client.guilds.cache.first();
    if (!guild || !config.ticketLogChannelId) return;

    const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Ticket Closed')
        .addFields(
            { name: 'Ticket ID', value: `#${ticket.id}`, inline: true },
            { name: 'User', value: ticket.username, inline: true },
            { name: 'Closed by', value: ticket.closedByName, inline: true },
            { name: 'Claimed by', value: ticket.claimedByName || 'Not claimed', inline: true }
        )
        .setTimestamp();

    await logChannel.send({ embeds: [embed] });
}

async function logTicketClaim(client, ticket) {
    const config = client.config;
    const guild = client.guilds.cache.first();
    if (!guild || !config.ticketLogChannelId) return;

    const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor(0x00aa00)
        .setTitle('Ticket Claimed')
        .addFields(
            { name: 'Ticket ID', value: `#${ticket.id}`, inline: true },
            { name: 'User', value: ticket.username, inline: true },
            { name: 'Claimed by', value: ticket.claimedByName, inline: true }
        )
        .setTimestamp();

    await logChannel.send({ embeds: [embed] });
}

async function logTicketRating(client, rating) {
    const config = client.config;
    const guild = client.guilds.cache.first();
    if (!guild || !config.ticketLogChannelId) return;

    const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
    if (!logChannel) return;

    const stars = '★'.repeat(rating.rating) + '☆'.repeat(5 - rating.rating);

    const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('New Rating')
        .addFields(
            { name: 'Ticket ID', value: `#${rating.ticketId}`, inline: true },
            { name: 'User', value: rating.username, inline: true },
            { name: 'Staff', value: rating.claimedByName || 'Unknown', inline: true },
            { name: 'Rating', value: `${stars} (${rating.rating}/5)`, inline: true }
        )
        .setTimestamp();

    await logChannel.send({ embeds: [embed] });
}
