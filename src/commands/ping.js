const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Melihat status dan latency bot"),

    async execute(interaction) {

        const sent = await interaction.reply({
            content: "🏓 Mengukur latency...",
            fetchReply: true
        });

        const botLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = interaction.client.ws.ping;

        await interaction.editReply(
            `🏓 **Pong!**

Bot Latency : **${botLatency} ms**
API Latency : **${apiLatency} ms**`
        );

    }
};