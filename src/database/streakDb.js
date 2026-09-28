const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "database.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS private_streaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT NOT NULL,
        member_ids TEXT NOT NULL,
        streak_count INTEGER DEFAULT 1,
        last_active_date TEXT
    );
`);

function parseMemberIds(raw) {
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
        return [];
    }
}

function insertPrivateStreak(channelId, memberIds, streakCount, lastActiveDate) {
    return db.prepare(`
        INSERT INTO private_streaks (channel_id, member_ids, streak_count, last_active_date)
        VALUES (?, ?, ?, ?)
    `).run(
        channelId,
        JSON.stringify(memberIds),
        streakCount,
        lastActiveDate
    );
}

function getAllPrivateStreaks() {
    return db.prepare(`
        SELECT *
        FROM private_streaks
        ORDER BY id DESC
    `).all();
}

function getStreaksByUserId(userId) {
    return getAllPrivateStreaks().filter((row) => {
        return parseMemberIds(row.member_ids).includes(String(userId));
    });
}

function getStreakByMembers(memberIds) {
    const target = [...memberIds].map(String).sort().join(",");

    return getAllPrivateStreaks().find((row) => {
        const current = parseMemberIds(row.member_ids).slice().sort().join(",");
        return current === target;
    }) || null;
}

function getStreakByChannelId(channelId) {
    return db.prepare(`
        SELECT *
        FROM private_streaks
        WHERE channel_id = ?
    `).get(channelId);
}

function updateStreakProgress(channelId, streakCount, lastActiveDate) {
    return db.prepare(`
        UPDATE private_streaks
        SET streak_count = ?, last_active_date = ?
        WHERE channel_id = ?
    `).run(streakCount, lastActiveDate, channelId);
}

function deleteStreakByChannelId(channelId) {
    return db.prepare(`
        DELETE FROM private_streaks
        WHERE channel_id = ?
    `).run(channelId);
}

module.exports = {
    db,
    parseMemberIds,
    insertPrivateStreak,
    getAllPrivateStreaks,
    getStreaksByUserId,
    getStreakByMembers,
    getStreakByChannelId,
    updateStreakProgress,
    deleteStreakByChannelId
};
