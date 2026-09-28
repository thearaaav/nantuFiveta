const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection
} = require("@discordjs/voice");

// Direktori penyimpanan file audio sementara
const tempDir = path.join(__dirname, "..", "..", "data", "temp");

// Pastikan direktori temp ada saat startup
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Bersihkan file sisa jika ada saat startup
try {
    const existingFiles = fs.readdirSync(tempDir);
    for (const file of existingFiles) {
        if (file.startsWith("tts_") && (file.endsWith(".wav") || file.endsWith(".mp3"))) {
            try {
                fs.unlinkSync(path.join(tempDir, file));
            } catch (_) {}
        }
    }
} catch (_) {}

// Map untuk menyimpan status voice & audio player per guild
// guildId -> { connection, player, currentTempFile, channelId }
const voiceSessions = new Map();

/**
 * Mencari path executable espeak-ng yang valid
 */
function getEspeakPath() {
    if (process.env.ESPEAK_PATH && fs.existsSync(process.env.ESPEAK_PATH)) {
        return process.env.ESPEAK_PATH;
    }

    const defaultWindowsPaths = [
        "C:\\Program Files\\eSpeak NG\\espeak-ng.exe",
        "C:\\Program Files (x86)\\eSpeak NG\\espeak-ng.exe"
    ];

    for (const p of defaultWindowsPaths) {
        if (fs.existsSync(p)) return p;
    }

    return "espeak-ng";
}

/**
 * Menghasilkan file audio WAV menggunakan eSpeak NG dengan parameter robotik ala game Repo
 * @param {string} text - Teks yang akan dibacakan
 * @param {string} outputPath - Lokasi file audio WAV sementara
 */
function generateRepoTTS(text, outputPath) {
    return new Promise((resolve, reject) => {
        const espeakBin = getEspeakPath();

        // Parameter khas game Repo:
        // -s 130: kecepatan berbicara (speed)
        // -p 40: nada/pitch rendah sintetis robotik
        const args = ["-s", "130", "-p", "40", "-w", outputPath, "--stdin"];

        const child = spawn(espeakBin, args);

        let stderr = "";
        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", (err) => {
            reject(new Error(`Gagal mengeksekusi espeak-ng: ${err.message}`));
        });

        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`espeak-ng keluar dengan kode ${code}: ${stderr}`));
            } else {
                resolve(outputPath);
            }
        });

        // Tulis teks ke stdin untuk menghindari batasan panjang command line dan escaping karakter
        child.stdin.write(text, "utf-8");
        child.stdin.end();
    });
}

/**
 * Menghapus file audio sementara secara aman
 */
function cleanupTempFile(filePath) {
    if (!filePath) return;
    fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
            console.error("❌ Gagal menghapus file temp audio:", err.message);
        }
    });
}

/**
 * Mendapatkan atau membuat session voice & audio player untuk suatu guild
 */
function getOrCreateSession(guildId, voiceChannel) {
    let session = voiceSessions.get(guildId);
    const existingConnection = getVoiceConnection(guildId);

    // Buat session baru jika belum ada atau koneksi sudah tidak aktif
    if (!session || !existingConnection || existingConnection.state.status === VoiceConnectionStatus.Destroyed) {
        // Hancurkan sisa koneksi lama jika ada
        if (existingConnection && existingConnection.state.status !== VoiceConnectionStatus.Destroyed) {
            try { existingConnection.destroy(); } catch (_) {}
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        session = {
            connection,
            player,
            currentTempFile: null,
            channelId: voiceChannel.id
        };

        // Logging status koneksi
        connection.on("stateChange", (oldState, newState) => {
            console.log(`📡 Voice Connection [${guildId}]: ${oldState.status} -> ${newState.status}`);
        });

        connection.on("error", (error) => {
            console.error(`❌ Voice Connection Error [${guildId}]:`, error?.message || error);
            leave(guildId);
        });

        // Event saat audio selesai diputar
        player.on(AudioPlayerStatus.Idle, () => {
            if (session.currentTempFile) {
                cleanupTempFile(session.currentTempFile);
                session.currentTempFile = null;
            }
        });

        // Event jika terjadi error pada audio player
        player.on("error", (error) => {
            console.error("❌ Audio Player Error:", error?.message || "Unknown error");
            if (session.currentTempFile) {
                cleanupTempFile(session.currentTempFile);
                session.currentTempFile = null;
            }
        });

        // Event jika koneksi terputus
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
                ]);
            } catch (_) {
                leave(guildId);
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            if (session.currentTempFile) {
                cleanupTempFile(session.currentTempFile);
                session.currentTempFile = null;
            }
            voiceSessions.delete(guildId);
        });

        voiceSessions.set(guildId, session);
    } else if (voiceChannel && session.channelId !== voiceChannel.id) {
        // Jika bot sudah di VC tapi beda channel, pindahkan ke channel user
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });
        session.connection = connection;
        session.channelId = voiceChannel.id;
        connection.subscribe(session.player);
    }

    return session;
}

/**
 * Bergabung ke Voice Channel
 * @param {import("discord.js").VoiceBasedChannel} voiceChannel
 */
async function join(voiceChannel) {
    const guildId = voiceChannel.guild.id;
    const session = getOrCreateSession(guildId, voiceChannel);

    try {
        await entersState(session.connection, VoiceConnectionStatus.Ready, 20_000);
        return session;
    } catch (err) {
        leave(guildId);
        throw err;
    }
}

/**
 * Keluar dari Voice Channel
 * @param {string} guildId
 */
function leave(guildId) {
    const session = voiceSessions.get(guildId);
    const connection = getVoiceConnection(guildId);

    if (!session && !connection) {
        return false;
    }

    if (session) {
        if (session.currentTempFile) {
            cleanupTempFile(session.currentTempFile);
            session.currentTempFile = null;
        }

        if (session.player) {
            try {
                session.player.stop(true);
            } catch (_) {}
        }

        voiceSessions.delete(guildId);
    }

    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
        try {
            connection.destroy();
        } catch (_) {}
    }

    return true;
}

/**
 * Mengecek apakah bot sedang berada di Voice Channel pada suatu guild
 * @param {string} guildId
 * @returns {boolean}
 */
function isInVoice(guildId) {
    const connection = getVoiceConnection(guildId);
    return Boolean(connection && connection.state.status !== VoiceConnectionStatus.Destroyed);
}

/**
 * Memutar suara Text-to-Speech (eSpeak NG Repo voice) di Voice Channel
 * @param {string} guildId
 * @param {import("discord.js").VoiceBasedChannel} voiceChannel
 * @param {string} text
 */
async function say(guildId, voiceChannel, text) {
    const session = getOrCreateSession(guildId, voiceChannel);

    try {
        await entersState(session.connection, VoiceConnectionStatus.Ready, 20_000);
    } catch (err) {
        leave(guildId);
        throw err;
    }

    // Hentikan audio sebelumnya dan hapus file lamanya jika sedang berputar
    if (session.currentTempFile) {
        cleanupTempFile(session.currentTempFile);
        session.currentTempFile = null;
    }
    session.player.stop(true);

    // Generate audio WAV menggunakan eSpeak NG
    const fileName = `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`;
    const filePath = path.join(tempDir, fileName);

    await generateRepoTTS(text, filePath);
    session.currentTempFile = filePath;

    const resource = createAudioResource(filePath);
    session.player.play(resource);

    return true;
}

module.exports = {
    join,
    leave,
    say,
    tts: say,
    isInVoice
};
