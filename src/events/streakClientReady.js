const streakService = require("../services/streakService");

let watcherStarted = false;

function startStreakWatcher(client) {
    if (watcherStarted) return;
    watcherStarted = true;

    const runCheck = async () => {
        try {
            await streakService.expireInactiveStreaks(client);
        } catch (err) {
            console.error("❌ Gagal cek streak padam:", err?.message || err);
        }
    };

    runCheck();
    setInterval(runCheck, 60 * 1000);
}

module.exports = {
    name: "clientReady",

    async execute(client) {
        startStreakWatcher(client);
        console.log("🔥 Streak watcher aktif.");
    }
};
