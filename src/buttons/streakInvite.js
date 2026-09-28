const { EmbedBuilder } = require("discord.js");
const streakService = require("../services/streakService");

function parseStreakButtonId(customId) {
    const parts = String(customId || "").split("_");
    if (parts.length < 5) return null;
    if (parts[0] !== "streak") return null;
    if (parts[1] !== "accept" && parts[1] !== "decline") return null;

    return {
        action: parts[1],
        inviterId: parts[2],
        guildId: parts[3],
        targetId: parts[4]
    };
}

function collectTargetIds(message, inviterId) {
    const ids = new Set();

    if (message.mentions?.users) {
        for (const user of message.mentions.users.values()) {
            if (user.bot) continue;
            if (user.id === inviterId) continue;
            ids.add(user.id);
        }
    }

    const description = message.embeds?.[0]?.description || "";
    const matches = description.matchAll(/<@!?(\d{17,20})>/g);
    for (const match of matches) {
        if (match[1] === inviterId) continue;
        ids.add(match[1]);
    }

    return [...ids];
}

function disableInviteEmbed(embed, description, color) {
    const updated = EmbedBuilder.from(embed || new EmbedBuilder().setTitle("🔥 Undangan Streak"))
        .setColor(color)
        .setDescription(description);

    if (updated.data) {
        updated.data.footer = undefined;
    }

    return updated;
}

module.exports = {
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;
        const parsed = parseStreakButtonId(customId);
        const isAccept = parsed?.action === "accept";
        const isDecline = parsed?.action === "decline";

        if (!parsed || (!isAccept && !isDecline)) return;

        const { inviterId, guildId, targetId } = parsed;
        if (interaction.user.id !== targetId) {
            return interaction.reply({
                content: "❌ Hanya orang yang diundang yang bisa merespon ajakan ini.",
                ephemeral: true
            });
        }

        const targetIds = streakService.uniqueMemberIds([
            targetId,
            ...collectTargetIds(interaction.message, inviterId)
        ]);

        const originalEmbed = interaction.message.embeds?.[0];
        const targetMentions = targetIds.map((id) => `<@${id}>`).join(" ");

        if (isDecline) {
            const declinedEmbed = disableInviteEmbed(
                originalEmbed,
                `❌ Ajakan streak dari <@${inviterId}> ditolak oleh <@${interaction.user.id}>.\n\nTarget: ${targetMentions}`,
                0xe74c3c
            );

            return interaction.update({
                embeds: [declinedEmbed],
                components: []
            });
        }

        try {
            await interaction.deferUpdate();

            const guild = interaction.guild
                || await interaction.client.guilds.fetch(guildId).catch(() => null);
            if (!guild) {
                return interaction.followUp({
                    content: "❌ Server asal undangan tidak ditemukan. Pastikan bot masih ada di server tersebut.",
                    ephemeral: true
                });
            }

            const memberIds = streakService.uniqueMemberIds([inviterId, ...targetIds]);
            const existing = await streakService.db.getStreakByMembers(memberIds);

            if (existing) {
                const existingChannel = guild.channels.cache.get(existing.channel_id);
                const acceptedEmbed = disableInviteEmbed(
                    originalEmbed,
                    `✅ Diterima! Channel streak untuk anggota ini sudah ada: ${existingChannel ? `<#${existing.channel_id}>` : "`(channel lama tidak ditemukan)`"}`,
                    0x2ecc71
                );

                return interaction.editReply({
                    embeds: [acceptedEmbed],
                    components: []
                });
            }

            const inviterMember = await guild.members.fetch(inviterId).catch(() => null);
            if (!inviterMember) {
                return interaction.followUp({
                    content: "❌ Pengirim undangan sudah tidak ada di server ini.",
                    ephemeral: true
                });
            }

            const channel = await streakService.createPrivateStreakChannel(
                guild,
                inviterMember,
                memberIds
            );

            const acceptedEmbed = disableInviteEmbed(
                originalEmbed,
                `✅ Diterima! Channel telah dibuat: ${channel}\n\nPeserta: ${memberIds.map((id) => `<@${id}>`).join(" ")}`,
                0x2ecc71
            );

            await interaction.editReply({
                embeds: [acceptedEmbed],
                components: []
            });
        } catch (err) {
            console.error("❌ Gagal menerima streak:", err?.message || err);

            const hint = /Kategori streak belum diatur/.test(err?.message || "")
                ? err.message
                : "❌ Gagal membuat channel streak. Pastikan bot punya izin Manage Channels dan ID kategori sudah diisi.";

            if (interaction.deferred || interaction.replied) {
                return interaction.followUp({
                    content: hint,
                    ephemeral: true
                });
            }

            return interaction.reply({
                content: hint,
                ephemeral: true
            });
        }
    }
};
