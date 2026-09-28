const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { generateAIResponse } = require("../services/geminiService");
const { splitMessage } = require("../utils/textSplitter");
const voiceService = require("../services/voiceService");
const chemistryService = require("../services/chemistryService");
const lmsService = require("../lms/lmsService");

// In-memory cooldowns per user
const chatCooldowns = new Map();
const CHAT_COOLDOWN_DURATION = 10 * 1000;

const ttsCooldowns = new Map();
const TTS_COOLDOWN_DURATION = 5 * 1000;

module.exports = {
    name: "messageCreate",

    async execute(message) {
        // Abaikan pesan dari bot
        if (message.author.bot) return;

        const content = message.content.trim();

        // Hanya proses pesan yang memiliki prefix 'n!'
        if (!content.startsWith("n!")) return;

        const userId = message.author.id;
        const now = Date.now();

        // =========================
        // COMMAND: n!join
        // =========================
        if (content === "n!join") {
            if (!message.guild) return;

            const voiceChannel = message.member?.voice?.channel;
            if (!voiceChannel) {
                return message.reply("❌ Kamu harus berada di Voice Channel terlebih dahulu.");
            }

            const botMember = message.guild.members.me || message.client?.user;
            const permissions = voiceChannel.permissionsFor(botMember);
            if (!permissions || !permissions.has(["ViewChannel", "Connect", "Speak"])) {
                return message.reply("❌ Bot tidak memiliki izin untuk melihat, bergabung, atau berbicara di Voice Channel tersebut.");
            }

            try {
                await voiceService.join(voiceChannel);
                return message.reply("🔊 nantuFive masuk ke Voice Channel.");
            } catch (err) {
                console.error("❌ Gagal n!join:", err?.message || err);
                return message.reply("❌ Gagal masuk ke Voice Channel.");
            }
        }

        // =========================
        // COMMAND: n!tts <teks>
        // =========================
        if (content === "n!tts" || content.startsWith("n!tts ")) {
            if (!message.guild) return;

            const text = content.slice(5).trim();

            if (!text) {
                return message.reply("❌ Masukkan teks yang ingin dibacakan. Contoh: n!tts Halo semuanya");
            }

            if (text.length > 300) {
                return message.reply("❌ Teks terlalu panjang. Maksimal 300 karakter.");
            }

            const userVoiceChannel = message.member?.voice?.channel;
            const botInVoice = voiceService.isInVoice(message.guild.id);

            if (!userVoiceChannel && !botInVoice) {
                return message.reply("❌ Kamu harus berada di Voice Channel terlebih dahulu.");
            }

            const targetChannel = userVoiceChannel || message.guild.members.me?.voice?.channel;
            if (!targetChannel) {
                return message.reply("❌ Kamu harus berada di Voice Channel terlebih dahulu.");
            }

            const botMember = message.guild.members.me || message.client?.user;
            const permissions = targetChannel.permissionsFor(botMember);
            if (!permissions || !permissions.has(["ViewChannel", "Connect", "Speak"])) {
                return message.reply("❌ Bot tidak memiliki izin untuk melihat, bergabung, atau berbicara di Voice Channel tersebut.");
            }

            // Anti-spam cooldown 5 detik untuk n!tts
            if (ttsCooldowns.has(userId)) {
                const lastUsed = ttsCooldowns.get(userId);
                if (now - lastUsed < TTS_COOLDOWN_DURATION) {
                    return message.reply("⏳ Tunggu beberapa detik sebelum menggunakan n!tts lagi.");
                }
            }

            ttsCooldowns.set(userId, now);
            setTimeout(() => {
                if (ttsCooldowns.get(userId) === now) {
                    ttsCooldowns.delete(userId);
                }
            }, TTS_COOLDOWN_DURATION);

            try {
                await voiceService.tts(message.guild.id, targetChannel, text);
            } catch (err) {
                console.error("❌ Gagal n!tts:", err?.message || err);
                return message.reply("❌ Gagal memutar suara di Voice Channel.");
            }
            return;
        }

        // =========================
        // COMMAND: n!leave
        // =========================
        if (content === "n!leave") {
            if (!message.guild) return;

            const inVoice = voiceService.isInVoice(message.guild.id);
            if (!inVoice) {
                return message.reply("❌ nantuFive tidak sedang berada di Voice Channel.");
            }

            try {
                voiceService.leave(message.guild.id);
                return message.reply("👋 nantuFive keluar dari Voice Channel.");
            } catch (err) {
                console.error("❌ Gagal n!leave:", err?.message || err);
                return message.reply("❌ nantuFive tidak sedang berada di Voice Channel.");
            }
        }

        // =========================
        // COMMAND: n!chat <pertanyaan>
        // =========================
        if (content === "n!chat" || content.startsWith("n!chat ")) {
            // Cek cooldown user untuk n!chat
            if (chatCooldowns.has(userId)) {
                const lastUsed = chatCooldowns.get(userId);
                if (now - lastUsed < CHAT_COOLDOWN_DURATION) {
                    return message.reply("⏳ Tunggu beberapa detik sebelum bertanya lagi.");
                }
            }

            const question = content.slice(6).trim();

            if (!question) {
                return message.reply("❌ Masukkan pertanyaan. Contoh: n!chat apa itu API?");
            }

            chatCooldowns.set(userId, now);
            setTimeout(() => {
                if (chatCooldowns.get(userId) === now) {
                    chatCooldowns.delete(userId);
                }
            }, CHAT_COOLDOWN_DURATION);

            try {
                await message.channel.sendTyping();
            } catch (_) {}

            try {
                const answer = await generateAIResponse(question);
                const chunks = splitMessage(answer, 1900);

                for (let i = 0; i < chunks.length; i++) {
                    if (i === 0) {
                        await message.reply(chunks[i]);
                    } else {
                        await message.channel.send(chunks[i]);
                    }
                }
            } catch (error) {
                console.error("❌ Error n!chat handler:", error?.message || "Unknown error");
                return message.reply("❌ Maaf, AI sedang mengalami masalah. Coba lagi nanti.");
            }
        }

        // =========================
        // COMMAND: n!cemi [leaderboard | lb | @user]
        // =========================
        if (content === "n!cemi" || content.startsWith("n!cemi ")) {
            if (!message.guild) return;

            const args = content.slice(6).trim().split(/\s+/).filter(Boolean);
            const sub = args[0]?.toLowerCase();

            // 1. Leaderboard: n!cemi leaderboard / n!cemi lb
            if (sub === "leaderboard" || sub === "lb") {
                const topDuos = await chemistryService.db.getTopDuosLeaderboard(10);

                if (!topDuos || topDuos.length === 0) {
                    return message.reply("🏆 Belum ada data leaderboard chemistry di server ini.");
                }

                const medals = ["🥇", "🥈", "🥉"];
                const lines = topDuos.map((d, index) => {
                    const badge = medals[index] || `\`#${index + 1}\``;
                    const lvlInfo = chemistryService.getDuoLevelInfo(d.points);
                    return `${badge} <@${d.user1_id}> & <@${d.user2_id}> — **${d.points} Pts** (Lvl ${lvlInfo.level})`;
                });

                const embed = new EmbedBuilder()
                    .setColor(0xf1c40f)
                    .setTitle("🏆 Top 10 Chemistry Duo Leaderboard")
                    .setDescription(lines.join("\n\n"))
                    .setFooter({ text: "Dihitung dari keaktifan bersama di Voice Channel" });

                return message.reply({ embeds: [embed] });
            }

            // 2. Detail Chemistry dengan User Tertentu: n!cemi @user
            let targetMention = message.mentions?.users?.first?.();
            if (!targetMention && message.mentions?.users && typeof message.mentions.users.values === "function") {
                targetMention = Array.from(message.mentions.users.values())[0];
            }
            if (!targetMention && args[0] && /^\d{17,20}$/.test(args[0])) {
                targetMention = await message.client?.users?.fetch?.(args[0]).catch(() => null);
            }

            if (targetMention) {
                if (targetMention.bot) {
                    return message.reply("❌ Bot tidak dapat memiliki chemistry. Hanya user asli yang dapat dihitung!");
                }

                if (targetMention.id === userId) {
                    return message.reply("❌ Kamu tidak bisa mengecek chemistry dengan dirimu sendiri!");
                }

                const points = await chemistryService.db.getDuoPoints(userId, targetMention.id);
                const info = chemistryService.getDuoLevelInfo(points);
                const rank = await chemistryService.db.getDuoRank(userId, targetMention.id);

                const embed = new EmbedBuilder()
                    .setColor(0xe91e63)
                    .setTitle("💞 Detail Chemistry Duo")
                    .setDescription(`Koneksi antara <@${userId}> dan <@${targetMention.id}>`)
                    .addFields(
                        { name: "⭐ Level", value: `**Level ${info.level}**`, inline: true },
                        { name: "✨ Poin Chemistry", value: `**${info.totalMenit}** / ${info.nextLevelTarget} Pts`, inline: true },
                        { name: "🏆 Peringkat Server", value: `**#${rank}**`, inline: true },
                        { name: "⏰ Menuju Level Berikutnya", value: `Kurang **${info.remainingMinutes} menit** lagi menuju **Level ${info.nextLevel}**`, inline: false }
                    )
                    .setFooter({ text: "Dapatkan +1 Poin setiap menit bersama di Voice Channel" });

                return message.reply({ embeds: [embed] });
            }

            // 3. Profil Chemistry Pengguna: n!cemi [halaman] (Paginasi per 10 tanpa progress bar)
            const allDuos = await chemistryService.db.getAllUserDuos(userId);
            const ITEMS_PER_PAGE = 10;
            const totalPages = Math.max(1, Math.ceil(allDuos.length / ITEMS_PER_PAGE));

            let requestedPage = parseInt(args[0], 10);
            if (isNaN(requestedPage) || requestedPage < 1) requestedPage = 1;
            if (requestedPage > totalPages) requestedPage = totalPages;

            let currentPage = requestedPage;

            const buildEmbed = (page) => {
                const startIndex = (page - 1) * ITEMS_PER_PAGE;
                const pageDuos = allDuos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                let duoText = "*Belum ada koneksi duo. Masuk ke Voice Channel berdua dengan teman untuk membangun chemistry!*";
                if (allDuos.length > 0) {
                    duoText = pageDuos.map((d, index) => {
                        const partnerId = d.user1_id === userId ? d.user2_id : d.user1_id;
                        const info = chemistryService.getDuoLevelInfo(d.points);
                        return `**${startIndex + index + 1}.** <@${partnerId}> — **Lvl ${info.level}** (${info.totalMenit}/${info.nextLevelTarget} Pts) • \`#${d.rank}\``;
                    }).join("\n");
                }

                return new EmbedBuilder()
                    .setColor(0xff69b4)
                    .setAuthor({
                        name: `Profil Chemistry: ${message.author.username}`,
                        iconURL: message.author.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(`Semua pengguna yang pernah berada di Voice Channel bersamamu:`)
                    .addFields(
                        { name: `💞 Daftar Koneksi Duo (${allDuos.length} Teman)`, value: duoText }
                    )
                    .setFooter({
                        text: `Halaman ${page}/${totalPages} • Total ${allDuos.length} Koneksi • Chemistry System`
                    });
            };

            const buildRow = (page) => {
                if (totalPages <= 1) return null;
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("cemi_prev")
                        .setLabel("◀️ Sebelumnya")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId("cemi_next")
                        .setLabel("Selanjutnya ▶️")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= totalPages)
                );
            };

            const initialRow = buildRow(currentPage);
            const replyMsg = await message.reply({
                embeds: [buildEmbed(currentPage)],
                components: initialRow ? [initialRow] : []
            });

            if (totalPages > 1) {
                const collector = replyMsg.createMessageComponentCollector({
                    filter: (i) => i.user.id === userId,
                    time: 60 * 1000
                });

                collector.on("collect", async (interaction) => {
                    if (interaction.customId === "cemi_prev" && currentPage > 1) {
                        currentPage--;
                    } else if (interaction.customId === "cemi_next" && currentPage < totalPages) {
                        currentPage++;
                    }

                    const newRow = buildRow(currentPage);
                    await interaction.update({
                        embeds: [buildEmbed(currentPage)],
                        components: newRow ? [newRow] : []
                    });
                });

                collector.on("end", async () => {
                    const disabledRow = buildRow(currentPage);
                    if (disabledRow) {
                        disabledRow.components.forEach((btn) => btn.setDisabled(true));
                        await replyMsg.edit({ components: [disabledRow] }).catch(() => null);
                    }
                });
            }

            return;
        }

        // =========================
        // COMMAND: n!lms [-t | -m] [nama mata kuliah]
        // =========================
        if (content === "n!lms" || content.startsWith("n!lms ")) {
            if (!message.guild) return;

            const args = content.slice(5).trim().split(/\s+/).filter(Boolean);
            const flag = args[0]?.toLowerCase();

            // Pilihan 1: Tampilkan Tugas Aktif (n!lms -t [nama mata kuliah])
            if (flag === "-t") {
                const courseQuery = args.slice(1).join(" ").trim();
                const waitMsg = await message.reply("⏳ Memeriksa tugas aktif di LMS Untad (Kursusku)...");

                try {
                    const { courses, assignments } = await lmsService.getActiveAssignments(courseQuery);

                    if (assignments.length === 0) {
                        const targetDesc = courseQuery
                            ? `untuk mata kuliah matching **"${courseQuery}"**`
                            : "dari semua mata kuliah aktif";
                        return waitMsg.edit(`✅ Tidak ada tugas aktif yang belum lewat deadline ${targetDesc}!`);
                    }

                    const lines = assignments.map((a, idx) => {
                        return `**${idx + 1}. [${a.title}](${a.link})**\n📚 **${a.courseName}**\n⏰ Batas Waktu: **${a.deadlineText}**\n🔗 [Buka Tugas di LMS](${a.link})`;
                    });

                    const embed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle("📝 Daftar Tugas Aktif LMS (Belum Lewat Deadline)")
                        .setDescription(lines.join("\n\n"))
                        .setFooter({ text: `Total: ${assignments.length} tugas aktif • LMS Untad Integrator` })
                        .setTimestamp();

                    return waitMsg.edit({ content: null, embeds: [embed] });
                } catch (err) {
                    console.error("❌ Error n!lms -t:", err?.message || err);
                    return waitMsg.edit(`❌ Gagal mengambil tugas dari LMS: ${err?.message || "Terjadi kesalahan."}`);
                }
            }

            // Pilihan 2: Tampilkan Materi Kuliah (n!lms -m [nama mata kuliah])
            if (flag === "-m") {
                const courseQuery = args.slice(1).join(" ").trim();
                if (!courseQuery) {
                    return message.reply("❌ Format salah! Gunakan: `n!lms -m [nama mata kuliah]`\nContoh: `n!lms -m rpl` atau `n!lms -m arsikom`");
                }

                const waitMsg = await message.reply(`⏳ Mengambil materi LMS untuk **"${courseQuery}"**...`);

                try {
                    const { courses, materials, allCourses } = await lmsService.getCourseMaterials(courseQuery);

                    if (courses.length === 0) {
                        const available = allCourses.map((c) => `• \`${c.fullname}\``).join("\n");
                        return waitMsg.edit(`❌ Mata kuliah dengan kata kunci **"${courseQuery}"** tidak ditemukan di Kursusku.\n\nDaftar mata kuliah yang tersedia:\n${available}`);
                    }

                    if (materials.length === 0) {
                        return waitMsg.edit(`ℹ️ Belum ada materi yang diunggah dosen untuk mata kuliah **${courses[0].fullname}**.`);
                    }

                    // Jika materi lebih dari 15, batasi per 15 agar tidak melebihi limit embed Discord
                    const displayMaterials = materials.slice(0, 15);
                    const lines = displayMaterials.map((m, idx) => {
                        return `**${idx + 1}.** [${m.title}](${m.link})`;
                    });

                    const embed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle(`📘 Materi LMS: ${courses[0].fullname}`)
                        .setDescription(lines.join("\n\n"))
                        .setFooter({ text: `Menampilkan ${displayMaterials.length} dari ${materials.length} materi • LMS Untad Integrator` })
                        .setTimestamp();

                    return waitMsg.edit({ content: null, embeds: [embed] });
                } catch (err) {
                    console.error("❌ Error n!lms -m:", err?.message || err);
                    return waitMsg.edit(`❌ Gagal mengambil materi dari LMS: ${err?.message || "Terjadi kesalahan."}`);
                }
            }

            // Pilihan 3: Bantuan & Daftar Mata Kuliah Kursusku (n!lms)
            const waitMsg = await message.reply("⏳ Memuat daftar mata kuliah Kursusku...");
            try {
                const { courses } = await lmsService.fetchLmsData(false);
                const courseList = courses.map((c, i) => `**${i + 1}.** ${c.fullname}`).join("\n");

                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle("🎓 LMS Untad Integrator (Kursusku Semester Ini)")
                    .setDescription(`Bot memantau **6 mata kuliah aktif** semester ini langsung dari menu **Kursusku**:\n\n${courseList}`)
                    .addFields(
                        {
                            name: "📝 Cek Tugas Aktif",
                            value: "`n!lms -t [nama mata kuliah]`\nContoh: `n!lms -t rpl` atau ketik `n!lms -t` untuk semua tugas yang belum lewat deadline.",
                            inline: false
                        },
                        {
                            name: "📘 Cek Materi Kuliah",
                            value: "`n!lms -m [nama mata kuliah]`\nContoh: `n!lms -m basis data` atau `n!lms -m arsikom` untuk melihat judul dan link akses materi.",
                            inline: false
                        }
                    )
                    .setFooter({ text: "Otomatis notifikasi materi & tugas baru (tag role Kelas A)" });

                return waitMsg.edit({ content: null, embeds: [embed] });
            } catch (err) {
                console.error("❌ Error n!lms:", err?.message || err);
                return waitMsg.edit(`❌ Gagal memuat data LMS: ${err?.message || "Terjadi kesalahan."}`);
            }
        }
    }
};
