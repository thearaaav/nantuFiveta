module.exports = {
    name: "voiceStateUpdate",

    /**
     * Event handler saat terjadi pembaruan status voice member
     * @param {import("discord.js").VoiceState} oldState
     * @param {import("discord.js").VoiceState} newState
     * @param {import("discord.js").Client} client
     */
    async execute(oldState, newState, client) {
        try {
            // Abaikan bot agar tidak memicu proses yang tidak perlu
            if (newState.member?.user?.bot || oldState.member?.user?.bot) {
                return;
            }

            // Penanganan perpindahan, masuk, atau keluar voice channel
            // Status ditangani oleh periodic tracker setiap 1 menit
        } catch (error) {
            console.error("❌ Error pada event voiceStateUpdate:", error?.message || error);
        }
    }
};
