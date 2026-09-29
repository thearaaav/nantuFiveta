const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");
const streakDb = require("../database/streakDb");
const streakConfig = require("../config/streak.js");

const expiringChannelIds = new Set();

/**
 * Mengambil tanggal hari ini dalam format YYYY-MM-DD zona waktu WITA (Asia/Makassar).
 */
function getTodayWita() {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Makassar"
    });
}

/**
 * Mengambil tanggal kemarin dalam format YYYY-MM-DD zona waktu WITA (Asia/Makassar).
 */
function getYesterdayWita() {
    const today = getTodayWita();
    const date = new Date(`${today}T12:00:00+08:00`);
    date.setDate(date.getDate() - 1);

    return date.toLocaleDateString("en-CA", {
        timeZone: "Asia/Makassar"
    });
}

/**
 * Menghitung selisih hari kalender antara dua tanggal YYYY-MM-DD (WITA).
 */
function getDaysDiff(fromStr, toStr) {
    if (!fromStr || !toStr) return 0;
    const d1 = new Date(`${String(fromStr).slice(0, 10)}T12:00:00+08:00`);
    const d2 = new Date(`${String(toStr).slice(0, 10)}T12:00:00+08:00`);
    const diffMs = d2.getTime() - d1.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Memeriksa apakah streak masih aktif atau dalam masa tenggang.
 */
function isStreakAlive(room, today = getTodayWita()) {
    if (!room) return false;

    if (room.status === "grace") {
        const graceStart = room.grace_start_date || room.last_active_date || today;
        const graceDiff = getDaysDiff(graceStart, today);
        return graceDiff < 2;
    }

    const diff = getDaysDiff(room.last_active_date, today);
    return diff <= 1;
}

function clipChannelName(name) {
    const text = String(name || "streak").trim() || "streak";
    return text.slice(0, 100);
}

async function resolveMemberName(guild, userId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) {
        return member.displayName || member.user?.globalName || member.user?.username || "user";
    }

    const user = await guild.client.users.fetch(userId).catch(() => null);
    return user?.globalName || user?.username || "user";
}

async function buildStreakChannelName(guild, memberIds, streakCount, creatorId) {
    const count = streakCount || 1;

    if (memberIds.length <= 2) {
        const names = [];
        for (const id of memberIds) {
            names.push(`@${await resolveMemberName(guild, id)}`);
        }

        while (names.length < 2) {
            names.push("@user");
        }

        return clipChannelName(`${names[0]} dan ${names[1]}—🔥${count}`);
    }

    const creatorName = await resolveMemberName(guild, creatorId || memberIds[0]);
    return clipChannelName(`streak from @${creatorName} — 🔥${count}`);
}

async function getHubChannel(client) {
    const hubChannelId = streakConfig.hubChannelId;
    if (!hubChannelId) return null;

    const channel = await client.channels.fetch(hubChannelId).catch(() => null);
    if (!channel || !channel.isTextBased?.()) return null;

    return channel;
}

async function getStreakCategory(guild) {
    const categoryId = streakConfig.categoryId;
    if (!categoryId) return null;

    const category = await guild.channels.fetch(categoryId).catch(() => null);
    if (!category || category.type !== ChannelType.GuildCategory) return null;

    return category;
}

async function sendUserDm(client, userId, payload) {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return false;

    try {
        await user.send(payload);
        return true;
    } catch (err) {
        console.error(`❌ Gagal kirim DM streak ke ${userId}:`, err?.message || err);
        return false;
    }
}

async function syncStreakChannelName(channel, room) {
    if (!channel?.guild || !room) return;

    const memberIds = streakDb.parseMemberIds(room.member_ids);
    const nextName = await buildStreakChannelName(
        channel.guild,
        memberIds,
        room.streak_count,
        memberIds[0]
    );

    if (channel.name === nextName) return;

    await channel.setName(nextName, "Update nama streak").catch((err) => {
        console.error("❌ Gagal rename channel streak:", err?.message || err);
    });
}

async function createPrivateStreakChannel(guild, inviterMember, memberIds) {
    const category = await getStreakCategory(guild);
    if (!category) {
        throw new Error("Kategori streak belum diatur. Isi categoryId di src/config/streak.js");
    }

    const channelName = await buildStreakChannelName(
        guild,
        memberIds,
        1,
        inviterMember.id
    );

    const permissionOverwrites = [
        {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        {
            id: guild.client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ManageChannels
            ]
        }
    ];

    for (const memberId of memberIds) {
        permissionOverwrites.push({
            id: memberId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles
            ]
        });
    }

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites,
        reason: "Private streak room"
    });

    const lastActiveDate = getTodayWita();
    await streakDb.insertPrivateStreak(channel.id, memberIds, 1, lastActiveDate);

    const welcomeEmbed = new EmbedBuilder()
        .setColor(0xff6b35)
        .setTitle("🔥 Streak Room Berhasil Dibuat!")
        .setDescription(
            `Selamat datang di private streak room!\n\n` +
            `👥 **Peserta:** ${memberIds.map((id) => `<@${id}>`).join(" ")}\n\n` +
            `🔥 **Current Streak: 1 Hari**\n\n` +
            `📋 **Aturan & Mekanisme Streak:**\n` +
            `1. **Jeda Hari Pertama:** Hari ini streak sudah tercatat aktif (**Jeda 1 hari**). Chat hari ini tidak mengubah streak.\n` +
            `2. **Lanjut Streak:** Kirim minimal 1 pesan besok (hari kedua) untuk menambah api streak (+1 hari).\n` +
            `3. **Masa Tenggang:** Jika di hari kedua tidak ada yang merespon, api streak akan masuk ke **Masa Tenggang selama 2 Hari**.\n` +
            `4. **Recovery (Pemulihan):** Selama masa tenggang, kirim pesan apa saja di room ini untuk memulihkan api dan streak akan lanjut.\n` +
            `5. **Batas Masa Tenggang:** Kesempatan masa tenggang maksimal **3 kali**. Jika habis 3 kali atau masa tenggang 2 hari selesai tanpa pemulihan, api streak akan hangus permanen.`
        )
        .setFooter({ text: "Jaga apinya tetap menyala setiap hari!" });

    await channel.send({
        content: memberIds.map((id) => `<@${id}>`).join(" "),
        embeds: [welcomeEmbed]
    });

    return channel;
}

async function expireStreak(client, room, reason = "Api streak padam") {
    if (!room?.channel_id || expiringChannelIds.has(room.channel_id)) {
        return;
    }

    expiringChannelIds.add(room.channel_id);

    try {
        const memberIds = streakDb.parseMemberIds(room.member_ids);
        const membersText = memberIds.map((id) => `<@${id}>`).join(" ");
        const channel = await client.channels.fetch(room.channel_id).catch(() => null);
        const channelLabel = channel ? `#${channel.name}` : "room streak";
        const streakCount = room.streak_count || 1;

        if (channel) {
            await channel.delete(reason).catch((err) => {
                console.error("❌ Gagal hapus channel streak:", err?.message || err);
            });
        }

        await streakDb.deleteStreakByChannelId(room.channel_id);

        const expiredEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🔥 Api Streak Telah Hangus")
            .setDescription(
                `Api streak **${channelLabel}** telah padam dan room-nya telah dihapus.\n\n` +
                `👥 **Peserta:** ${membersText}\n` +
                `🔥 **Streak Terakhir:** ${streakCount} Hari\n` +
                `ℹ️ **Alasan:** ${reason}`
            )
            .setFooter({ text: "Gunakan n!streak @user jika ingin memulai streak baru." });

        for (const memberId of memberIds) {
            await sendUserDm(client, memberId, { embeds: [expiredEmbed] });
        }
    } finally {
        expiringChannelIds.delete(room.channel_id);
    }
}

/**
 * Menangani aktivitas pesan di dalam room streak.
 */
async function handleStreakActivity(message, room) {
    const memberIds = streakDb.parseMemberIds(room.member_ids);
    if (!memberIds.includes(message.author.id)) return;

    const today = getTodayWita();

    // ==========================================
    // KASUS 1: Room sedang dalam masa tenggang (Grace Period)
    // Respon apa pun dari anggota memulihkan api streak (Recovery)!
    // ==========================================
    if (room.status === "grace") {
        await streakDb.updateStreakRecovery(message.channel.id, room.streak_count, today);
        room.status = "active";
        room.last_active_date = today;
        room.grace_start_date = null;

        const recoveryEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("🔥 Api Streak Berhasil Dipulihkan!")
            .setDescription(
                `Terima kasih <@${message.author.id}>! Api streak berhasil diselamatkan dari masa tenggang.\n\n` +
                `🔥 **Current Streak:** **${room.streak_count} Hari**\n` +
                `🛡️ **Sisa Kuota Masa Tenggang:** **${Math.max(0, 3 - (room.grace_used || 0))} kali** lagi.`
            )
            .setFooter({ text: "Jeda 1 hari berlaku. Kirim pesan besok untuk melanjutkan streak!" });

        await message.channel.send({ embeds: [recoveryEmbed] }).catch(() => null);
        await syncStreakChannelName(message.channel, room);
        return;
    }

    // ==========================================
    // KASUS 2: Room dalam status normal (active)
    // ==========================================
    const diff = getDaysDiff(room.last_active_date, today);

    // Hari yang sama (diff === 0): jeda 1 hari aktif
    if (diff === 0) {
        return;
    }

    // Hari kedua (diff === 1): respon tepat waktu, streak bertambah!
    if (diff === 1) {
        const nextCount = (room.streak_count || 1) + 1;
        await streakDb.updateStreakProgress(message.channel.id, nextCount, today);
        room.streak_count = nextCount;
        room.last_active_date = today;

        const progressEmbed = new EmbedBuilder()
            .setColor(0xff6b35)
            .setTitle("🔥 Streak Bertambah!")
            .setDescription(
                `Api streak terus membara!\n\n` +
                `🔥 **Current Streak:** **${nextCount} Hari**\n` +
                `Diperbarui oleh <@${message.author.id}>`
            )
            .setFooter({ text: "Jeda 1 hari sampai besok. Pertahankan apinya!" });

        await message.channel.send({ embeds: [progressEmbed] }).catch(() => null);
        await syncStreakChannelName(message.channel, room);
        return;
    }

    // Lewat dari hari kedua (diff >= 2):
    // Jika jatah masa tenggang sudah habis 3 kali -> hangus
    if ((room.grace_used || 0) >= 3) {
        await expireStreak(
            message.client,
            room,
            "Api streak padam karena batas masa tenggang (3 kali) telah habis dan tidak ada respon di hari kedua."
        );
        return;
    }

    // Masuk masa tenggang dan langsung ter-recovery oleh pesan saat ini!
    const nextGraceUsed = (room.grace_used || 0) + 1;
    await streakDb.updateStreakRecoveryWithGrace(
        message.channel.id,
        room.streak_count,
        today,
        nextGraceUsed
    );
    room.status = "active";
    room.last_active_date = today;
    room.grace_used = nextGraceUsed;
    room.grace_start_date = null;

    const quickRecoveryEmbed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle("🛡️ Api Streak Masuk Masa Tenggang & Berhasil Dipulihkan!")
        .setDescription(
            `Api streak sempat terlambat karena tidak ada aktivitas di hari kedua, namun langsung diselamatkan oleh <@${message.author.id}>!\n\n` +
            `🔥 **Current Streak:** **${room.streak_count} Hari**\n` +
            `🛡️ **Pemakaian Masa Tenggang:** Ke-**${nextGraceUsed}** dari **3 kali**\n` +
            `Sisa Kuota: **${Math.max(0, 3 - nextGraceUsed)} kali** lagi.`
        )
        .setFooter({ text: "Jeda 1 hari berlaku. Jangan lupa kirim pesan lagi besok!" });

    await message.channel.send({ embeds: [quickRecoveryEmbed] }).catch(() => null);
    await syncStreakChannelName(message.channel, room);
}

/**
 * Pemeriksaan otomatis setiap 60 detik untuk mendeteksi streak masuk masa tenggang atau hangus.
 */
async function expireInactiveStreaks(client) {
    const today = getTodayWita();
    const rooms = await streakDb.getAllPrivateStreaks();

    for (const room of rooms) {
        if (!room.channel_id) continue;

        // KASUS 1: Room sedang dalam masa tenggang (grace)
        if (room.status === "grace") {
            const graceStartDate = room.grace_start_date || room.last_active_date || today;
            const graceDiff = getDaysDiff(graceStartDate, today);

            // Jika masa tenggang 2 hari telah berakhir tanpa ada recovery -> Hangus!
            if (graceDiff >= 2) {
                await expireStreak(
                    client,
                    room,
                    "Api streak padam karena masa tenggang 2 hari telah berakhir tanpa adanya pesan pemulihan (recovery)."
                );
            }
            continue;
        }

        // KASUS 2: Room berstatus aktif (active)
        const diff = getDaysDiff(room.last_active_date, today);

        // Jika diff <= 1 (hari ini atau kemarin masih aktif), aman!
        if (diff <= 1) {
            continue;
        }

        // Jika diff >= 2 (hari kedua tidak ada respon baru):
        // Cek apakah sudah memakai masa tenggang 3 kali
        if ((room.grace_used || 0) >= 3) {
            await expireStreak(
                client,
                room,
                "Api streak padam karena kuota masa tenggang (3 kali) telah habis dan tidak ada respon di hari kedua."
            );
            continue;
        }

        // Masuk masa tenggang 2 hari!
        const nextGraceUsed = (room.grace_used || 0) + 1;
        room.status = "grace";
        room.grace_used = nextGraceUsed;
        room.grace_start_date = today;

        await streakDb.updateStreakGrace(room.channel_id, nextGraceUsed, today);

        // Kirim peringatan masa tenggang di channel room
        const channel = await client.channels.fetch(room.channel_id).catch(() => null);
        if (channel && channel.isTextBased?.()) {
            const memberIds = streakDb.parseMemberIds(room.member_ids);
            const mentions = memberIds.map((id) => `<@${id}>`).join(" ");

            const warnEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("⚠️ API STREAK SEKARAT! MASUK MASA TENGGANG (2 HARI)")
                .setDescription(
                    `Perhatian ${mentions}!\n\n` +
                    `Tidak ada pesan baru di hari kedua. Api streak kamu hampir padam!\n\n` +
                    `⏱️ **Masa Tenggang:** Berlangsung selama **2 Hari** mulai hari ini.\n` +
                    `🛡️ **Pemakaian Masa Tenggang:** Ke-**${nextGraceUsed}** dari maksimal **3 kali**.\n\n` +
                    `👉 **Cara Pemulihan (Recovery):** Kirim pesan apa saja di room ini sebelum 2 hari berakhir untuk menyelamatkan api streak!`
                )
                .setFooter({ text: "Jika 2 hari berakhir tanpa pesan, room streak akan dihapus permanen." });

            await channel.send({
                content: mentions,
                embeds: [warnEmbed]
            }).catch((err) => {
                console.error("❌ Gagal kirim peringatan masa tenggang:", err?.message || err);
            });
        }
    }
}

async function deleteStreakRoom(channel, room, reason = "Streak dihapus") {
    await streakDb.deleteStreakByChannelId(channel.id);
    await channel.delete(reason).catch(() => null);
}

function uniqueMemberIds(ids) {
    return [...new Set(ids.map(String))];
}

module.exports = {
    getTodayWita,
    getYesterdayWita,
    getDaysDiff,
    isStreakAlive,
    buildStreakChannelName,
    getHubChannel,
    sendUserDm,
    getStreakCategory,
    createPrivateStreakChannel,
    expireStreak,
    expireInactiveStreaks,
    handleStreakActivity,
    deleteStreakRoom,
    uniqueMemberIds,
    db: streakDb
};
