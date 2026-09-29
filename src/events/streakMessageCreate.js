const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const streakService = require("../services/streakService");

function collectInviteTargets(message) {
    const targets = [];
    const seen = new Set();

    if (!message.mentions?.users) return targets;

    for (const user of message.mentions.users.values()) {
        if (user.bot) continue;
        if (user.id === message.author.id) continue;
        if (seen.has(user.id)) continue;
        seen.add(user.id);
        targets.push(user);
    }

    return targets;
}

function buildInviteDescription(inviterId, targets) {
    if (targets.length <= 1) {
        return `<@${inviterId}> mengajak membuat api streak! Apakah kamu menerima?`;
    }

    const together = targets.map((user) => `<@${user.id}>`).join(", ");
    return `<@${inviterId}> mengajak membuat api streak bersama ${together}! Apakah kamu menerima?`;
}

function buildShowcaseEmbed(user, rooms, guild) {
    const lines = rooms.map((room) => {
        const memberIds = streakService.db.parseMemberIds(room.member_ids);
        const channel = guild.channels.cache.get(room.channel_id);
        const channelText = channel ? `<#${room.channel_id}>` : `\`channel (${room.channel_id})\``;
        const membersText = memberIds.map((id) => `<@${id}>`).join(" ");
        const statusText = room.status === "grace" ? "⚠️ Masa Tenggang" : "🔥 Aktif";
        const graceLeft = Math.max(0, 3 - (room.grace_used || 0));

        return `${channelText}\nAnggota: ${membersText}\nStreak: **🔥 ${room.streak_count || 1} Hari** (${statusText}) • Sisa Tenggang: **${graceLeft}/3**`;
    });

    return new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle("🔥 Showcase Private Streak")
        .setDescription(lines.join("\n\n") || "Belum ada room streak.")
        .setFooter({ text: `Milik ${user.username}` });
}

module.exports = {
    name: "messageCreate",

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const content = message.content.trim();
        const isStreakCommand = content === "n!streak" || content.startsWith("n!streak ");
        const currentRoom = await streakService.db.getStreakByChannelId(message.channel.id);

        if (!isStreakCommand) {
            if (currentRoom) {
                try {
                    await streakService.handleStreakActivity(message, currentRoom);
                } catch (err) {
                    console.error("❌ Gagal update aktivitas streak:", err?.message || err);
                }
            }
            return;
        }

        const rest = content.slice("n!streak".length).trim();

        try {
            if (currentRoom && rest === "") {
                await streakService.handleStreakActivity(message, currentRoom);
                const memberIds = streakService.db.parseMemberIds(currentRoom.member_ids);
                const statusText = currentRoom.status === "grace" ? "⚠️ Masa Tenggang (2 Hari)" : "🔥 Aktif";
                const graceLeft = Math.max(0, 3 - (currentRoom.grace_used || 0));

                const infoEmbed = new EmbedBuilder()
                    .setColor(currentRoom.status === "grace" ? 0xe74c3c : 0xff6b35)
                    .setTitle("🔥 Status Room Streak")
                    .setDescription(
                        `👥 **Anggota:** ${memberIds.map((id) => `<@${id}>`).join(" ")}\n` +
                        `🔥 **Current Streak:** **${currentRoom.streak_count || 1} Hari**\n` +
                        `📊 **Status:** ${statusText}\n` +
                        `🛡️ **Sisa Kuota Masa Tenggang:** **${graceLeft} / 3 kali**\n` +
                        `📅 **Aktivitas Terakhir:** ${currentRoom.last_active_date || "Hari ini"}`
                    )
                    .setFooter({ text: "Kirim pesan setiap hari untuk menjaga api tetap menyala." });

                return message.reply({ embeds: [infoEmbed] });
            }

            if (rest.toLowerCase() === "-del") {
                if (!currentRoom) {
                    return message.reply("❌ `n!streak -del` hanya bisa dipakai di dalam channel streak.");
                }

                const memberIds = streakService.db.parseMemberIds(currentRoom.member_ids);
                if (!memberIds.includes(message.author.id)) {
                    return message.reply("❌ Kamu bukan anggota room streak ini.");
                }

                await streakService.deleteStreakRoom(
                    message.channel,
                    currentRoom,
                    `Streak dihapus oleh ${message.author.tag}`
                );
                return;
            }

            if (rest.toLowerCase() === "-show") {
                const rooms = await streakService.db.getStreaksByUserId(message.author.id);

                if (!rooms.length) {
                    return message.reply("❌ Kamu belum memiliki private streak room.");
                }

                const embed = buildShowcaseEmbed(message.author, rooms, message.guild);
                return message.reply({ embeds: [embed] });
            }

            const targets = collectInviteTargets(message);
            if (!targets.length) {
                return message.reply("❌ Tag minimal 1 user. Contoh: `n!streak @user`, `n!streak -show`, atau `n!streak -del`");
            }

            const category = await streakService.getStreakCategory(message.guild);
            if (!category) {
                return message.reply("❌ Kategori streak belum diatur. Isi `categoryId` di `src/config/streak.js`.");
            }

            const inviterId = message.author.id;
            const guildId = message.guild.id;
            const targetMentions = targets.map((user) => `<@${user.id}>`).join(" ");
            const inviteDescription = buildInviteDescription(inviterId, targets);
            const failedDm = [];

            for (const target of targets) {
                const inviteEmbed = new EmbedBuilder()
                    .setColor(0xff6b35)
                    .setTitle("🔥 Undangan Streak")
                    .setDescription(inviteDescription);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`streak_accept_${inviterId}_${guildId}_${target.id}`)
                        .setLabel("Terima")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`streak_decline_${inviterId}_${guildId}_${target.id}`)
                        .setLabel("Tolak")
                        .setStyle(ButtonStyle.Danger)
                );

                const sent = await streakService.sendUserDm(message.client, target.id, {
                    embeds: [inviteEmbed],
                    components: [row]
                });

                if (!sent) {
                    failedDm.push(`<@${target.id}>`);
                }
            }

            if (failedDm.length === targets.length) {
                return message.reply(
                    `❌ Undangan gagal dikirim. Minta ${failedDm.join(", ")} membuka DM dari anggota server ini, lalu coba lagi.`
                );
            }

            if (failedDm.length > 0) {
                return message.reply(
                    `📩 Undangan streak dikirim ke DM. Beberapa orang belum bisa dihubungi: ${failedDm.join(", ")}.`
                );
            }

            return message.reply(
                `📩 Undangan streak kamu berhasil dikirim ke DM ${targetMentions}. Silakan minta mereka cek pesan dari bot.`
            );
        } catch (err) {
            console.error("❌ Gagal n!streak:", err?.message || err);
            return message.reply("❌ Gagal memproses perintah streak. Coba lagi nanti.");
        }
    }
};
