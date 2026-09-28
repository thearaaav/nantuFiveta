const pool = require("./db");

function parseMemberIds(raw) {
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
        return [];
    }
}

async function insertPrivateStreak(channelId, memberIds, streakCount, lastActiveDate) {
    return pool.query(`
        INSERT INTO private_streaks (channel_id, member_ids, streak_count, last_active_date)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [
        channelId,
        JSON.stringify(memberIds),
        streakCount,
        lastActiveDate
    ]);
}

async function getAllPrivateStreaks() {
    const result = await pool.query(`
        SELECT *
        FROM private_streaks
        ORDER BY id DESC
    `);

    return result.rows;
}

async function getStreaksByUserId(userId) {
    const rows = await getAllPrivateStreaks();

    return rows.filter((row) => {
        return parseMemberIds(row.member_ids).includes(String(userId));
    });
}

async function getStreakByMembers(memberIds) {
    const target = [...memberIds].map(String).sort().join(",");
    const rows = await getAllPrivateStreaks();

    return rows.find((row) => {
        const current = parseMemberIds(row.member_ids).slice().sort().join(",");
        return current === target;
    }) || null;
}

async function getStreakByChannelId(channelId) {
    const result = await pool.query(`
        SELECT *
        FROM private_streaks
        WHERE channel_id = $1
    `, [channelId]);

    return result.rows[0] || null;
}

async function updateStreakProgress(channelId, streakCount, lastActiveDate) {
    return pool.query(`
        UPDATE private_streaks
        SET streak_count = $1, last_active_date = $2
        WHERE channel_id = $3
    `, [streakCount, lastActiveDate, channelId]);
}

async function deleteStreakByChannelId(channelId) {
    return pool.query(`
        DELETE FROM private_streaks
        WHERE channel_id = $1
    `, [channelId]);
}

module.exports = {
    db: pool,
    parseMemberIds,
    insertPrivateStreak,
    getAllPrivateStreaks,
    getStreaksByUserId,
    getStreakByMembers,
    getStreakByChannelId,
    updateStreakProgress,
    deleteStreakByChannelId
};
