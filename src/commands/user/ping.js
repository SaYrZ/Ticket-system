const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot ping'),
    
    async execute(client, interaction) {
        const ping = client.ws.ping;
        
        const embed = new EmbedBuilder()
            .setColor(ping < 100 ? 0x00ff00 : ping < 300 ? 0xffaa00 : 0xff0000)
            .setTitle('Bot Ping')
            .addFields(
                { name: 'WebSocket Ping', value: `${ping}ms`, inline: true }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
