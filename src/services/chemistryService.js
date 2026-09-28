const chemistryDb = require("../database/chemistryDb");

/**
 * Menghitung total menit kumulatif yang dibutuhkan untuk mencapai Level N
 * Rumus: 10 * N * (N + 1)
 * @param {number} level
 * @returns {number}
 */
function getTotalMinutesForLevel(level) {
    if (level <= 0) return 0;
    return 10 * level * (level + 1);
}

/**
 * Menghitung level progresif, sisa menit, dan progress bar teks
 * Rumus Level: Math.floor((-1 + Math.sqrt(1 + (8 * totalMenit) / 20)) / 2)
 * @param {number} pointsOrMinutes
 */
function getDuoLevelInfo(pointsOrMinutes) {
    const totalMenit = Math.max(0, pointsOrMinutes || 0);

    // 1. Level saat ini (Unlimited Leveling)
    const level = Math.floor((-1 + Math.sqrt(1 + (8 * totalMenit) / 20)) / 2);

    // 2. Total menit kumulatif untuk mencapai level saat ini
    const currentLevelBase = getTotalMinutesForLevel(level);

    // 3. Total menit kumulatif untuk mencapai level berikutnya
    const nextLevel = level + 1;
    const nextLevelTarget = getTotalMinutesForLevel(nextLevel);

    // 4. Tambahan menit yang dibutuhkan pada rentang level ini (20 * nextLevel)
    const neededInThisLevel = nextLevelTarget - currentLevelBase;

    // 5. Menit yang sudah dicapai di level saat ini
    const progressInThisLevel = totalMenit - currentLevelBase;

    // 6. Sisa menit yang dibutuhkan menuju level berikutnya
    const remainingMinutes = nextLevelTarget - totalMenit;

    // 7. Persentase progres level
    const percentage = neededInThisLevel > 0
        ? Math.min(100, Math.max(0, Math.floor((progressInThisLevel / neededInThisLevel) * 100)))
        : 100;

    // 8. Progress bar tekstual 10 blok (contoh: [████████░░] 80%)
    const totalBars = 10;
    const filledBars = Math.min(totalBars, Math.max(0, Math.round((percentage / 100) * totalBars)));
    const emptyBars = totalBars - filledBars;
    const progressBar = `[${"█".repeat(filledBars)}${"░".repeat(emptyBars)}] ${percentage}%`;

    return {
        level,
        totalMenit,
        currentLevelBase,
        nextLevel,
        nextLevelTarget,
        neededInThisLevel,
        progressInThisLevel,
        remainingMinutes,
        percentage,
        progressBar
    };
}

let trackerInterval = null;

/**
 * Memulai voice channel tracker yang memeriksa keaktifan pasangan duo setiap 1 menit
 * @param {import("discord.js").Client} client
 */
function startVoiceTracker(client) {
    if (trackerInterval) {
        clearInterval(trackerInterval);
    }

    console.log("🎙️ Chemistry Voice Tracker diaktifkan (interval: 1 menit).");

    trackerInterval = setInterval(() => {
        try {
            for (const guild of client.guilds.cache.values()) {
                // Ambil semua channel yang bertipe voice
                const voiceChannels = guild.channels.cache.filter((c) => c.isVoiceBased());

                for (const channel of voiceChannels.values()) {
                    // PENGECUALIAN BOT: Hanya ambil anggota manusia (user-user asli)
                    const humanMembers = channel.members.filter((m) => !m.user.bot);

                    // Tracker hanya berjalan jika minimal ada 2 orang manusia
                    if (humanMembers.size < 2) continue;

                    const membersList = Array.from(humanMembers.values());

                    // Kombinasi Pasangan Duo (Semua pasangan manusia mendapatkan +1 Poin dan +1 nus_balance)
                    const duoPairs = [];
                    for (let i = 0; i < membersList.length; i++) {
                        for (let j = i + 1; j < membersList.length; j++) {
                            duoPairs.push([membersList[i].id, membersList[j].id]);
                        }
                    }

                    if (duoPairs.length > 0) {
                        chemistryDb.addDuoPointsTransaction(duoPairs);
                    }
                }
            }
        } catch (error) {
            console.error("❌ Error pada Chemistry Voice Tracker:", error?.message || error);
        }
    }, 60 * 1000);
}

module.exports = {
    getTotalMinutesForLevel,
    getDuoLevelInfo,
    startVoiceTracker,
    db: chemistryDb
};
