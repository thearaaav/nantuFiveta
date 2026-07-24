const {
    SlashCommandBuilder
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("tugas")
        .setDescription("Kelola daftar tugas"),

    async execute(interaction) {

        await interaction.reply({
            content: "🚧 Fitur sedang dikembangkan.",
            ephemeral: true
        });

    }

};