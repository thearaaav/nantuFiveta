const { EmbedBuilder } = require("discord.js");
const lmsDb = require("./lmsDb");
const { scrapeAllLmsModules } = require("./lmsScraper");

let lmsInterval = null;
let isScrapingRunning = false;

// Cache modul dan mata kuliah di memori (TTL: 5 menit)
let cachedData = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Mengambil data scrape LMS terkini (menggunakan cache jika belum kedaluwarsa)
 * @param {boolean} forceRefresh
 */
async function fetchLmsData(forceRefresh = false) {
    const lmsUrl = process.env.LMS_URL;
    const username = process.env.LMS_USERNAME;
    const password = process.env.LMS_PASSWORD;

    if (!lmsUrl || !username || !password) {
        throw new Error("Kredensial LMS belum lengkap di file .env");
    }

    const now = Date.now();
    if (!forceRefresh && cachedData && now - lastCacheTime < CACHE_TTL_MS) {
        return cachedData;
    }

    const result = await scrapeAllLmsModules(lmsUrl, username, password);
    cachedData = result;
    lastCacheTime = now;
    return result;
}

/**
 * Mengirim embed notifikasi untuk MATERI baru ke channel LMS (tanpa tag role)
 * @param {import("discord.js").TextChannel} channel
 * @param {{ moduleId: string, courseName: string, title: string, link: string }} item
 */
async function sendMaterialNotification(channel, item) {
    const embed = new EmbedBuilder()
        .setTitle("📘 Materi Baru LMS")
        .setColor(0x2ecc71)
        .addFields([
            { name: "📚 Mata Kuliah", value: `**${item.courseName}**`, inline: false },
            { name: "📄 Judul Materi", value: item.title, inline: false },
            { name: "🔗 Link LMS", value: `[Klik di sini untuk membuka di LMS](${item.link})`, inline: false }
        ])
        .setTimestamp()
        .setFooter({ text: "LMS Vibel Fatek Untad Notifier" });

    await channel.send({ embeds: [embed] });
}

/**
 * Mengirim embed notifikasi untuk TUGAS baru ke:
 *  - #daftar-tugas  (tanpa mention)
 *  - #pengumuman    (dengan tag role Anak TI A 25)
 * @param {import("discord.js").Client} client
 * @param {{ moduleId: string, courseName: string, title: string, link: string, deadlineText?: string }} item
 */
async function sendTaskNotification(client, item) {
    const { taskListChannel, taskNotifChannel } = require("../config/channels");
    const roleId = process.env.LMS_CLASS_A_ROLE_ID || "1451492469287026708";

    const fields = [
        { name: "📚 Mata Kuliah", value: `**${item.courseName}**`, inline: false },
        { name: "📋 Judul Tugas", value: item.title, inline: false }
    ];

    if (item.deadlineText) {
        fields.push({ name: "⏰ Batas Waktu (Deadline)", value: `**${item.deadlineText}**`, inline: false });
    }

    fields.push({ name: "🔗 Link LMS", value: `[Klik di sini untuk membuka di LMS](${item.link})`, inline: false });

    const embed = new EmbedBuilder()
        .setTitle("📝 Tugas Baru LMS")
        .setColor(0xe74c3c)
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: "LMS Vibel Fatek Untad Notifier" });

    // 1. Kirim ke #daftar-tugas (tanpa mention)
    const listChannel = await client.channels.fetch(taskListChannel).catch(() => null);
    if (listChannel) {
        await listChannel.send({ embeds: [embed] }).catch((e) =>
            console.error("❌ Gagal kirim tugas ke #daftar-tugas:", e?.message)
        );
    } else {
        console.warn(`⚠️ Channel #daftar-tugas [${taskListChannel}] tidak ditemukan.`);
    }

    // 2. Kirim ke #pengumuman (dengan tag role kelas A)
    const notifChannel = await client.channels.fetch(taskNotifChannel).catch(() => null);
    if (notifChannel) {
        const mention = roleId ? `<@&${roleId}>` : "";
        await notifChannel.send({
            content: mention || undefined,
            embeds: [embed]
        }).catch((e) =>
            console.error("❌ Gagal kirim tugas ke #pengumuman:", e?.message)
        );
    } else {
        console.warn(`⚠️ Channel #pengumuman [${taskNotifChannel}] tidak ditemukan.`);
    }
}

/**
 * Menjalankan satu siklus pemeriksaan dan notifikasi otomatis
 * @param {import("discord.js").Client} client
 */
async function runLmsCheck(client) {
    if (isScrapingRunning) {
        console.log("⏳ LMS check sebelumnya masih berjalan, melewati siklus ini.");
        return;
    }

    const materiChannelId = process.env.LMS_DISCORD_CHANNEL_ID;
    if (!materiChannelId) return;

    isScrapingRunning = true;

    try {
        console.log("🔍 Memulai pengecekan pembaruan LMS (Kursusku)...");

        // Channel materi (#lms)
        const materiChannel = await client.channels.fetch(materiChannelId).catch(() => null);
        if (!materiChannel) {
            console.warn(`⚠️ LMS Notifier: Channel materi [${materiChannelId}] tidak ditemukan.`);
        }

        // Ambil data terbaru dari mata kuliah Kursusku
        const { courses, modules } = await fetchLmsData(true);
        let newCount = 0;

        for (const item of modules) {
            // Cek apakah modul sudah pernah disimpan/dinotifikasi sebelumnya
            if (!(await lmsDb.isModuleNotified(item.moduleId))) {
                // Jika tugas sudah lewat deadline: tandai di DB agar tidak di-spam, tapi jangan kirim ke Discord
                if (item.type === "TUGAS" && item.isExpired) {
                    await lmsDb.saveNotifiedModule(item);
                    continue;
                }

                // Simpan ke DB terlebih dahulu
                await lmsDb.saveNotifiedModule(item);

                // Kirim notifikasi ke channel yang sesuai
                if (item.type === "TUGAS") {
                    await sendTaskNotification(client, item);
                } else if (item.type === "MATERI" && materiChannel) {
                    await sendMaterialNotification(materiChannel, item);
                }

                newCount++;

                // Jeda 500ms antar pesan agar tidak rate-limited
                await new Promise((r) => setTimeout(r, 500));
            }
        }

        console.log(`✅ Selesai cek LMS. Total matkul: ${courses.length}, Modul: ${modules.length}, Baru dinotifikasi: ${newCount}`);
    } catch (error) {
        console.error("❌ Error saat menjalankan pengecekan LMS:", error?.message || error);
    } finally {
        isScrapingRunning = false;
    }
}

/**
 * Memulai background job scheduler untuk LMS Notifier
 * @param {import("discord.js").Client} client
 */
function startLmsScheduler(client) {
    if (lmsInterval) {
        clearInterval(lmsInterval);
    }

    const lmsUrl = process.env.LMS_URL;
    const username = process.env.LMS_USERNAME;
    const password = process.env.LMS_PASSWORD;
    const channelId = process.env.LMS_DISCORD_CHANNEL_ID;

    if (!lmsUrl || !username || !password || !channelId) {
        console.log("ℹ️ Kredensial LMS belum lengkap di .env, scheduler LMS dinonaktifkan.");
        return;
    }

    const intervalMinutes = parseInt(process.env.LMS_CHECK_INTERVAL_MINUTES, 10) || 20;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`📡 LMS Untad Scheduler aktif (interval pemeriksaan: ${intervalMinutes} menit).`);

    // Jalankan pemeriksaan pertama setelah 10 detik
    setTimeout(() => {
        runLmsCheck(client);
    }, 10 * 1000);

    // Jalankan secara berkala
    lmsInterval = setInterval(() => {
        runLmsCheck(client);
    }, intervalMs);
}

const COURSE_ALIASES = {
    rpl: ["rekayasa perangkat lunak", "rpl"],
    arsikom: ["arsitektur sistem komputer", "arsikom"],
    ask: ["arsitektur sistem komputer", "ask"],
    imk: ["interaksi manusia", "imk"],
    api: ["rekayasa antarmuka pemrograman aplikasi", "api", "rapi"],
    rapi: ["rekayasa antarmuka pemrograman aplikasi", "rapi", "api"],
    bd: ["basis data", "basdat", "bd"],
    basdat: ["basis data", "basdat", "bd"],
    sig: ["sistem informasi geografis", "sig", "gis"],
    gis: ["sistem informasi geografis", "sig", "gis"]
};

/**
 * Mencocokkan nama mata kuliah dengan query pencarian (termasuk singkatan seperti rpl, arsikom, sig)
 */
function courseMatchesQuery(courseName, query) {
    if (!query || !query.trim() || query.trim().toLowerCase() === "all") return true;
    const q = query.trim().toLowerCase();
    const c = courseName.toLowerCase();

    // 1. Cocok sebagian teks langsung
    if (c.includes(q)) return true;

    // 2. Cek alias singkatan
    if (COURSE_ALIASES[q]) {
        for (const alias of COURSE_ALIASES[q]) {
            if (c.includes(alias)) return true;
        }
    }

    // 3. Cek akronim kata awal (contoh: Rekayasa Perangkat Lunak -> rpl)
    const words = c.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const initials = words.map((w) => w[0]).join("");
    if (initials.includes(q)) return true;

    return false;
}

/**
 * Mendapatkan daftar tugas aktif yang belum lewat deadline
 * @param {string} [courseQuery]
 */
async function getActiveAssignments(courseQuery = "") {
    const { courses, modules } = await fetchLmsData(false);

    let filtered = modules.filter((m) => m.type === "TUGAS" && !m.isExpired);

    if (courseQuery && courseQuery.trim() && courseQuery.toLowerCase() !== "all") {
        filtered = filtered.filter((m) => courseMatchesQuery(m.courseName, courseQuery));
    }

    return { courses, assignments: filtered };
}

/**
 * Mendapatkan daftar materi untuk suatu mata kuliah
 * @param {string} [courseQuery]
 */
async function getCourseMaterials(courseQuery = "") {
    const { courses, modules } = await fetchLmsData(false);

    let targetCourses = courses;
    if (courseQuery && courseQuery.trim() && courseQuery.toLowerCase() !== "all") {
        targetCourses = courses.filter((c) => courseMatchesQuery(c.fullname, courseQuery));
    }

    const targetCourseNames = new Set(targetCourses.map((c) => c.fullname));
    const materials = modules.filter((m) => m.type === "MATERI" && targetCourseNames.has(m.courseName));

    return { courses: targetCourses, materials, allCourses: courses };
}

module.exports = {
    startLmsScheduler,
    runLmsCheck,
    sendMaterialNotification,
    sendTaskNotification,
    fetchLmsData,
    getActiveAssignments,
    getCourseMaterials
};
