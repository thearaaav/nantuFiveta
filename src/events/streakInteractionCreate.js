const streakInvite = require("../buttons/streakInvite");

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId || "";
        if (!customId.startsWith("streak_accept_") && !customId.startsWith("streak_decline_")) {
            return;
        }

        try {
            await streakInvite.execute(interaction);
        } catch (err) {
            console.error("❌ ERROR STREAK BUTTON:", err);

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({
                        content: "❌ Terjadi kesalahan saat memproses undangan streak.",
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: "❌ Terjadi kesalahan saat memproses undangan streak.",
                        ephemeral: true
                    });
                }
            } catch (_) {
                // abaikan error sekunder saat reply gagal
            }
        }
    }
};
