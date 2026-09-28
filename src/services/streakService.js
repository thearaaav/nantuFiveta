const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");
const streakDb = require("../database/streakDb");
const streakConfig = require("../config/streak.js");

const expiringChannelIds = new Set();

function getTodayWita() {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Makassar"
    });
}

function getYesterdayWita() {
    const today = getTodayWita();
    const date = new Date(`${today}T12:00:00+08:00`);
    date.setDate(date.getDate() - 1);

    return date.toLocaleDateString("en-CA", {
        timeZone: "Asia/Makassar"
    });
}

function isStreakAlive(lastActiveDate, today = getTodayWita(), yesterday = getYesterdayWita()) {
    return lastActiveDate === today || lastActiveDate === yesterday;
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
    streakDb.insertPrivateStreak(channel.id, memberIds, 1, lastActiveDate);

    const welcomeEmbed = new EmbedBuilder()
        .setColor(0xff6b35)
        .setTitle("🔥 Streak Room")
        .setDescription(
            `Selamat datang di room streak!\n\n${memberIds.map((id) => `<@${id}>`).join(" ")}\n\n**🔥 Current Streak: 1 Hari**`
        )
        .setFooter({ text: "Kirim pesan setiap hari untuk menjaga api streak." });

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

        streakDb.deleteStreakByChannelId(room.channel_id);

        const expiredEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🔥 Api Streak Padam")
            .setDescription(
                `Api streak **${channelLabel}** telah padam dan room-nya dihapus.\n\nPeserta: ${membersText}\nStreak terakhir: **🔥 ${streakCount} Hari**`
            );

        for (const memberId of memberIds) {
            await sendUserDm(client, memberId, { embeds: [expiredEmbed] });
        }
    } finally {
        expiringChannelIds.delete(room.channel_id);
    }
}

async function handleStreakActivity(message, room) {
    const memberIds = streakDb.parseMemberIds(room.member_ids);
    if (!memberIds.includes(message.author.id)) return;

    const today = getTodayWita();
    const yesterday = getYesterdayWita();

    if (room.last_active_date === today) return;

    if (!isStreakAlive(room.last_active_date, today, yesterday)) {
        await expireStreak(message.client, room, "Api streak padam karena tidak aktif");
        return;
    }

    if (room.last_active_date === yesterday) {
        const nextCount = (room.streak_count || 1) + 1;
        streakDb.updateStreakProgress(message.channel.id, nextCount, today);
        room.streak_count = nextCount;
        room.last_active_date = today;
        await syncStreakChannelName(message.channel, room);
    }
}

async function expireInactiveStreaks(client) {
    const today = getTodayWita();
    const yesterday = getYesterdayWita();
    const rooms = streakDb.getAllPrivateStreaks();

    for (const room of rooms) {
        if (isStreakAlive(room.last_active_date, today, yesterday)) continue;
        await expireStreak(client, room, "Api streak padam karena tidak aktif");
    }
}

async function deleteStreakRoom(channel, room, reason = "Streak dihapus") {
    streakDb.deleteStreakByChannelId(channel.id);
    await channel.delete(reason);
}

function uniqueMemberIds(ids) {
    return [...new Set(ids.map(String))];
}

module.exports = {
    getTodayWita,
    getYesterdayWita,
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
