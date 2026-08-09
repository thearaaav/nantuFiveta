const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const {
    communicatorRole
} = require("../../config/permissions");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("talk")
        .setDescription("Mengirim pesan sebagai bot")
        .addStringOption(option =>
            option
                .setName("pesan")
                .setDescription("Pesan yang ingin dikirim")
                .setRequired(false)
        ),

    async execute(interaction) {

        // =========================
        // Cek permission role
        // =========================

        const allowed =
            communicatorRole.some(roleId =>
                interaction.member.roles.cache.has(roleId)
            );

        if (!allowed) {

            return interaction.reply({
                content:
                    "❌ Kamu tidak memiliki izin menggunakan command ini.",
                ephemeral: true
            });

        }


        // =========================
        // Ambil pesan
        // =========================

        const pesan =
            interaction.options.getString("pesan");


        // =========================
        // Jika pesan langsung diberikan
        // =========================

        if (pesan) {

            await interaction.channel.send({
                content: pesan
            });

            return interaction.reply({
                content:
                    "✅ Pesan berhasil dikirim.",
                ephemeral: true
            });

        }


        // =========================
        // Jika tanpa pesan → Modal
        // =========================

        const modal =
            new ModalBuilder()
                .setCustomId("talk-modal")
                .setTitle("Kirim Pesan");


        const input =
            new TextInputBuilder()
                .setCustomId("talk-message")
                .setLabel("Pesan")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder(
                    "Tulis pesan yang ingin dikirim..."
                )
                .setRequired(true)
                .setMaxLength(2000);


        const row =
            new ActionRowBuilder()
                .addComponents(input);


        modal.addComponents(row);


        await interaction.showModal(modal);

    }

};