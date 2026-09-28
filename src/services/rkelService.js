const { getAllStudents } = require("../database/studentsDb");

/**
 * Fisher-Yates shuffle (pengacakan adil in-place pada salinan array)
 */
function fisherYatesShuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

/**
 * Memecah daftar nama menjadi token berdasarkan koma
 */
function splitNames(raw) {
    if (!raw || typeof raw !== "string") return [];

    return raw
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
}

/**
 * Mengambil nilai flag -s / -a (case-insensitive).
 * Nilai flag adalah teks sampai flag berikutnya atau akhir string.
 */
function extractFlagValue(text, flag) {
    if (!text) return "";

    const regex = new RegExp(`-${flag}\\s+([\\s\\S]*?)(?=\\s+-[sa](?:\\s|$)|$)`, "i");
    const match = text.match(regex);

    return match ? match[1].trim() : "";
}

/**
 * Parser argumen n!rkel
 * Contoh: "4 -s Budi, Siti -a Kating Agus, Kating Doni"
 */
function parseRkelArgs(rawArgs) {
    const trimmed = (rawArgs || "").trim();

    if (!trimmed) {
        return {
            error: "❌ Format salah. Contoh: `n!rkel 4` atau `n!rkel 4 -s Budi, Siti -a Kating Agus`"
        };
    }

    const match = trimmed.match(/^(\d+)(?:\s+([\s\S]*))?$/);
    if (!match) {
        return {
            error: "❌ Argumen pertama harus jumlah maksimal anggota per kelompok. Contoh: `n!rkel 4`"
        };
    }

    const maxMembers = parseInt(match[1], 10);
    if (!Number.isInteger(maxMembers) || maxMembers < 1) {
        return {
            error: "❌ Jumlah maksimal anggota harus bilangan bulat lebih dari 0."
        };
    }

    const flagsText = (match[2] || "").trim();
    const skipNames = splitNames(extractFlagValue(flagsText, "s"));
    const addNames = splitNames(extractFlagValue(flagsText, "a"));

    return {
        maxMembers,
        skipNames,
        addNames
    };
}

function namesMatch(fullName, query) {
    return String(fullName).toLowerCase().includes(String(query).toLowerCase());
}

/**
 * Menyusun daftar peserta sesi: mahasiswa DB dikurangi skip, ditambah nama luar
 */
function buildParticipantList(students, skipNames, addNames) {
    const skipped = [];
    const remaining = [];

    for (const student of students) {
        const matchedSkip = skipNames.find((query) => namesMatch(student.nama, query));
        if (matchedSkip) {
            skipped.push(student.nama);
        } else {
            remaining.push({
                nama: student.nama,
                source: "db"
            });
        }
    }

    const added = [];
    for (const extraName of addNames) {
        const alreadyListed = remaining.some((p) => namesMatch(p.nama, extraName) || namesMatch(extraName, p.nama));
        if (alreadyListed) continue;

        remaining.push({
            nama: extraName,
            source: "add"
        });
        added.push(extraName);
    }

    return {
        participants: remaining,
        skipped,
        added
    };
}

/**
 * Membagi daftar yang sudah diacak secara merata.
 * Jumlah kelompok dikunci oleh ceil(N / max), lalu sisa 1 orang
 * diberikan acak ke kelompok berbeda (tidak melebihi max_anggota).
 */
function splitIntoGroups(shuffled, maxMembers) {
    const totalMahasiswa = shuffled.length;
    if (totalMahasiswa === 0) return [];

    const totalKelompok = Math.ceil(totalMahasiswa / maxMembers);
    const minAnggota = Math.floor(totalMahasiswa / totalKelompok);
    let sisa = totalMahasiswa - (totalKelompok * minAnggota);

    const groups = [];
    let cursor = 0;

    for (let i = 0; i < totalKelompok; i++) {
        groups.push(shuffled.slice(cursor, cursor + minAnggota));
        cursor += minAnggota;
    }

    const groupIndexes = fisherYatesShuffle(
        groups.map((_, index) => index)
    );

    for (const index of groupIndexes) {
        if (sisa <= 0) break;
        if (groups[index].length >= maxMembers) continue;

        groups[index].push(shuffled[cursor]);
        cursor += 1;
        sisa -= 1;
    }

    return groups;
}

/**
 * Menjalankan pengacakan kelompok dari database + filter sesi
 */
async function generateGroups(maxMembers, skipNames = [], addNames = []) {
    const students = await getAllStudents();
    const { participants, skipped, added } = buildParticipantList(students, skipNames, addNames);

    const shuffled = fisherYatesShuffle(participants);
    const groups = splitIntoGroups(shuffled, maxMembers);

    return {
        totalDb: students.length,
        totalShuffled: shuffled.length,
        skipped,
        added,
        skipRequested: skipNames,
        addRequested: addNames,
        maxMembers,
        groups
    };
}

module.exports = {
    parseRkelArgs,
    generateGroups,
    fisherYatesShuffle,
    splitIntoGroups
};
