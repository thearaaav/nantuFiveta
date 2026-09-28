const { EmbedBuilder } = require("discord.js");
const rkelService = require("../services/rkelService");
const { splitMessage } = require("../utils/textSplitter");

function formatGroupBody(groups) {
    if (!groups.length) return "";

    return groups.map((group, index) => {
        const members = group
            .map((member, memberIndex) => `${memberIndex + 1}. ${member.nama}`)
            .join("\n");

        return `**Kelompok ${index + 1}** (${group.length} orang)\n${members}`;
    }).join("\n\n");
}

function buildHeader(result) {
    const lines = [
        `Total mahasiswa yang diacak: **${result.totalShuffled}** orang`,
        `Maksimal anggota per kelompok: **${result.maxMembers}**`
    ];

    if (result.skipped.length > 0) {
        lines.push(`⏭️ Skip: **${result.skipped.length}** — ${result.skipped.join(", ")}`);
    } else if (result.skipRequested.length > 0) {
        lines.push(`⏭️ Skip: tidak ada nama yang cocok (${result.skipRequested.join(", ")})`);
    }

    if (result.added.length > 0) {
        lines.push(`➕ Add: **${result.added.length}** — ${result.added.join(", ")}`);
    }

    return lines.join("\n");
}

function getWitaTimestamp() {
    return new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Makassar",
        dateStyle: "medium",
        timeStyle: "short"
    });
}

module.exports = {
    name: "messageCreate",

    async execute(message) {
        if (message.author.bot) return;

        const content = message.content.trim();

        if (content !== "n!rkel" && !content.startsWith("n!rkel ")) return;

        const rawArgs = content.slice(6).trim();
        const parsed = rkelService.parseRkelArgs(rawArgs);

        if (parsed.error) {
            return message.reply(parsed.error);
        }

        try {
            const result = rkelService.generateGroups(
                parsed.maxMembers,
                parsed.skipNames,
                parsed.addNames
            );

            if (result.totalShuffled === 0) {
                return message.reply("❌ Tidak ada mahasiswa yang bisa diacak. Isi tabel `students` atau cek filter `-s` / `-a`.");
            }

            const header = buildHeader(result);
            const body = formatGroupBody(result.groups);
            const footerText = `Diacak pada ${getWitaTimestamp()} WITA`;
            const description = `${header}\n\n${body}`;
            const chunks = splitMessage(description, 3900);

            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(i === 0 ? "🎲 Random Picker Group" : `🎲 Random Picker Group (lanjutan ${i + 1})`)
                    .setDescription(chunks[i])
                    .setFooter({ text: footerText });

                if (i === 0) {
                    await message.reply({ embeds: [embed] });
                } else {
                    await message.channel.send({ embeds: [embed] });
                }
            }
        } catch (err) {
            console.error("❌ Gagal n!rkel:", err?.message || err);
            return message.reply("❌ Gagal mengacak kelompok. Coba lagi nanti.");
        }
    }
};
