const pool = require("./db");

function formatDateWita(val) {
    if (!val) return null;
    if (val instanceof Date) {
        return val.toLocaleDateString("en-CA", {
            timeZone: "Asia/Makassar"
        });
    }
    if (typeof val === "string") {
        return val.slice(0, 10);
    }
    return String(val).slice(0, 10);
}

function normalizeStreakRow(row) {
    if (!row) return null;
    return {
        ...row,
        streak_count: Number(row.streak_count || 1),
        last_active_date: formatDateWita(row.last_active_date),
        status: row.status || "active",
        grace_used: Number(row.grace_used || 0),
        grace_start_date: formatDateWita(row.grace_start_date),
        last_warning_date: formatDateWita(row.last_warning_date)
    };
}

function parseMemberIds(raw) {
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
        return [];
    }
}

async function insertPrivateStreak(channelId, memberIds, streakCount, lastActiveDate) {
    const result = await pool.query(`
        INSERT INTO private_streaks (channel_id, member_ids, streak_count, last_active_date, status, grace_used, grace_start_date)
        VALUES ($1, $2, $3, $4, 'active', 0, NULL)
        RETURNING *
    `, [
        channelId,
        JSON.stringify(memberIds),
        streakCount,
        lastActiveDate
    ]);

    return normalizeStreakRow(result.rows[0]);
}

async function getAllPrivateStreaks() {
    const result = await pool.query(`
        SELECT *
        FROM private_streaks
        ORDER BY id DESC
    `);

    return result.rows.map(normalizeStreakRow);
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

    return normalizeStreakRow(result.rows[0]) || null;
}

async function updateStreakProgress(channelId, streakCount, lastActiveDate) {
    return pool.query(`
        UPDATE private_streaks
        SET streak_count = $1, last_active_date = $2, status = 'active', grace_start_date = NULL
        WHERE channel_id = $3
    `, [streakCount, lastActiveDate, channelId]);
}

async function updateStreakGrace(channelId, graceUsed, graceStartDate) {
    return pool.query(`
        UPDATE private_streaks
        SET status = 'grace', grace_used = $1, grace_start_date = $2
        WHERE channel_id = $3
    `, [graceUsed, graceStartDate, channelId]);
}

async function updateStreakRecovery(channelId, streakCount, lastActiveDate) {
    return pool.query(`
        UPDATE private_streaks
        SET status = 'active', streak_count = $1, last_active_date = $2, grace_start_date = NULL
        WHERE channel_id = $3
    `, [streakCount, lastActiveDate, channelId]);
}

async function updateStreakRecoveryWithGrace(channelId, streakCount, lastActiveDate, graceUsed) {
    return pool.query(`
        UPDATE private_streaks
        SET status = 'active', streak_count = $1, last_active_date = $2, grace_used = $3, grace_start_date = NULL
        WHERE channel_id = $4
    `, [streakCount, lastActiveDate, graceUsed, channelId]);
}

async function deleteStreakByChannelId(channelId) {
    return pool.query(`
        DELETE FROM private_streaks
        WHERE channel_id = $1
    `, [channelId]);
}

module.exports = {
    db: pool,
    formatDateWita,
    normalizeStreakRow,
    parseMemberIds,
    insertPrivateStreak,
    getAllPrivateStreaks,
    getStreaksByUserId,
    getStreakByMembers,
    getStreakByChannelId,
    updateStreakProgress,
    updateStreakGrace,
    updateStreakRecovery,
    updateStreakRecoveryWithGrace,
    deleteStreakByChannelId
};
