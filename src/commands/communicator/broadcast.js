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

const {
    broadcastChannel
} = require("../../config/channels");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("broadcast")
        .setDescription("Mengirim broadcast ke channel pengumuman")
        .addStringOption(option =>
            option
                .setName("pesan")
                .setDescription("Pesan broadcast")
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

            const channel =
                await interaction.client.channels.fetch(
                    broadcastChannel
                );

            if (!channel) {

                return interaction.reply({
                    content:
                        "❌ Channel broadcast tidak ditemukan.",
                    ephemeral: true
                });

            }


            await channel.send({

                content:
                    `@everyone ${pesan}`,

                allowedMentions: {
                    parse: ["everyone"]
                }

            });


            return interaction.reply({
                content:
                    "✅ Broadcast berhasil dikirim.",
                ephemeral: true
            });

        }


        // =========================
        // Jika tanpa pesan → Modal
        // =========================

        const modal =
            new ModalBuilder()
                .setCustomId("broadcast-modal")
                .setTitle("Kirim Broadcast");


        const input =
            new TextInputBuilder()
                .setCustomId("broadcast-message")
                .setLabel("Pesan Broadcast")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder(
                    "Tulis pesan broadcast..."
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