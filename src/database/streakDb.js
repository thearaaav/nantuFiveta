const pool = require("./db");

function parseMemberIds(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
        return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
    }
}

async function insertPrivateStreak(channelId, memberIds, streakCount, lastActiveDate) {
    const res = await pool.query(`
        INSERT INTO private_streaks (channel_id, member_ids, streak_count, last_active_date)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [
        channelId,
        JSON.stringify(memberIds),
        streakCount,
        lastActiveDate
    ]);
    return res.rows[0];
}

async function getAllPrivateStreaks() {
    const res = await pool.query(`
        SELECT *
        FROM private_streaks
        ORDER BY id DESC
    `);
    return res.rows;
}

async function getStreaksByUserId(userId) {
    const all = await getAllPrivateStreaks();
    return all.filter((row) => {
        return parseMemberIds(row.member_ids).includes(String(userId));
    });
}

async function getStreakByMembers(memberIds) {
    const target = [...memberIds].map(String).sort().join(",");
    const all = await getAllPrivateStreaks();

    return all.find((row) => {
        const current = parseMemberIds(row.member_ids).slice().sort().join(",");
        return current === target;
    }) || null;
}

async function getStreakByChannelId(channelId) {
    const res = await pool.query(`
        SELECT *
        FROM private_streaks
        WHERE channel_id = $1
    `, [channelId]);
    return res.rows[0] || null;
}

async function updateStreakProgress(channelId, streakCount, lastActiveDate) {
    const res = await pool.query(`
        UPDATE private_streaks
        SET streak_count = $1, last_active_date = $2
        WHERE channel_id = $3
        RETURNING *
    `, [streakCount, lastActiveDate, channelId]);
    return res.rows[0] || null;
}

async function deleteStreakByChannelId(channelId) {
    return pool.query(`
        DELETE FROM private_streaks
        WHERE channel_id = $1
    `, [channelId]);
}

module.exports = {
    db: pool,
    pool,
    parseMemberIds,
    insertPrivateStreak,
    getAllPrivateStreaks,
    getStreaksByUserId,
    getStreakByMembers,
    getStreakByChannelId,
    updateStreakProgress,
    deleteStreakByChannelId
};
