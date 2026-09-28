const pool = require("./db");

/**
 * Menormalkan urutan ID pasangan agar selalu user1_id < user2_id
 */
function normalizePair(idA, idB) {
    return idA < idB ? [idA, idB] : [idB, idA];
}

/**
 * Menambahkan poin untuk pasangan duo dan menambah saldo nus_balance (PostgreSQL Transaction)
 * @param {Array<[string, string]>} pairs
 */
async function addDuoPointsTransaction(pairs) {
    if (!pairs || pairs.length === 0) return;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const updatedUsers = new Set();

        for (const [idA, idB] of pairs) {
            const [u1, u2] = normalizePair(idA, idB);
            await client.query(`
                INSERT INTO chemistry_duo (user1_id, user2_id, points)
                VALUES ($1, $2, 1)
                ON CONFLICT (user1_id, user2_id) DO UPDATE SET points = chemistry_duo.points + 1
            `, [u1, u2]);

            updatedUsers.add(u1);
            updatedUsers.add(u2);
        }

        for (const userId of updatedUsers) {
            await client.query(`
                INSERT INTO users (user_id, nus_balance)
                VALUES ($1, 1)
                ON CONFLICT (user_id) DO UPDATE SET nus_balance = users.nus_balance + 1
            `, [userId]);
        }

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Error addDuoPointsTransaction:", err?.message || err);
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Menghitung ranking leaderboard untuk pasangan duo tertentu
 * @param {string} userA
 * @param {string} userB
 * @returns {Promise<number|string>}
 */
async function getDuoRank(userA, userB) {
    const [u1, u2] = normalizePair(userA, userB);
    const rowRes = await pool.query(`
        SELECT points FROM chemistry_duo WHERE user1_id = $1 AND user2_id = $2
    `, [u1, u2]);

    const row = rowRes.rows[0];
    if (!row || Number(row.points) <= 0) return "-";

    const rankRes = await pool.query(`
        SELECT COUNT(*) + 1 AS rank FROM chemistry_duo WHERE points > $1
    `, [row.points]);

    const rankRow = rankRes.rows[0];
    return rankRow ? Number(rankRow.rank) : 1;
}

/**
 * Mengambil Top 3 Duo Chemistry milik seorang pengguna beserta rank leaderboard
 * @param {string} userId
 * @param {number} limit
 */
async function getUserTopDuos(userId, limit = 3) {
    const res = await pool.query(`
        SELECT * FROM chemistry_duo
        WHERE (user1_id = $1 OR user2_id = $1) AND points > 0
        ORDER BY points DESC
        LIMIT $2
    `, [userId, limit]);

    const result = [];
    for (const r of res.rows) {
        const rankRes = await pool.query(`
            SELECT COUNT(*) + 1 AS rank FROM chemistry_duo WHERE points > $1
        `, [r.points]);

        result.push({
            ...r,
            points: Number(r.points),
            rank: rankRes.rows[0] ? Number(rankRes.rows[0].rank) : 1
        });
    }

    return result;
}

/**
 * Mengambil semua pasangan Duo Chemistry milik seorang pengguna beserta rank leaderboard
 * @param {string} userId
 */
async function getAllUserDuos(userId) {
    const res = await pool.query(`
        SELECT * FROM chemistry_duo
        WHERE (user1_id = $1 OR user2_id = $1) AND points > 0
        ORDER BY points DESC
    `, [userId]);

    const result = [];
    for (const r of res.rows) {
        const rankRes = await pool.query(`
            SELECT COUNT(*) + 1 AS rank FROM chemistry_duo WHERE points > $1
        `, [r.points]);

        result.push({
            ...r,
            points: Number(r.points),
            rank: rankRes.rows[0] ? Number(rankRes.rows[0].rank) : 1
        });
    }

    return result;
}

/**
 * Mengambil poin chemistry antara dua pengguna spesifik
 * @param {string} userA
 * @param {string} userB
 */
async function getDuoPoints(userA, userB) {
    const [u1, u2] = normalizePair(userA, userB);
    const res = await pool.query(`
        SELECT points FROM chemistry_duo WHERE user1_id = $1 AND user2_id = $2
    `, [u1, u2]);

    const row = res.rows[0];
    return row ? Number(row.points) : 0;
}

/**
 * Mengambil Top N Pasangan Duo dengan Poin tertinggi di server
 * @param {number} limit
 */
async function getTopDuosLeaderboard(limit = 10) {
    const res = await pool.query(`
        SELECT * FROM chemistry_duo
        WHERE points > 0
        ORDER BY points DESC
        LIMIT $1
    `, [limit]);

    return res.rows.map((r) => ({
        ...r,
        points: Number(r.points)
    }));
}

/**
 * Menambahkan akumulasi menit ke grup (3+ orang)
 */
async function addGroupMinutesTransaction(memberIds, minutes = 1) {
    const sortedIds = [...memberIds].sort();
    const memberIdsJson = JSON.stringify(sortedIds);

    const existingRes = await pool.query(
        "SELECT * FROM chemistry_group WHERE member_ids = $1",
        [memberIdsJson]
    );

    if (existingRes.rows.length > 0) {
        const existingGroup = existingRes.rows[0];
        await pool.query(
            "UPDATE chemistry_group SET total_minutes = total_minutes + $1 WHERE group_id = $2",
            [minutes, existingGroup.group_id]
        );
        return existingGroup.group_id;
    }

    const allGroupsRes = await pool.query("SELECT group_id FROM chemistry_group");
    let maxNum = 0;
    for (const g of allGroupsRes.rows) {
        const match = g.group_id?.match(/^IT-(\d+)$/i);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }
    const nextGroupId = `IT-${maxNum + 1}`;

    await pool.query(
        "INSERT INTO chemistry_group (group_id, member_ids, total_minutes, custom_name) VALUES ($1, $2, $3, NULL)",
        [nextGroupId, memberIdsJson, minutes]
    );
    return nextGroupId;
}

/**
 * Mengambil semua grup yang diikuti oleh pengguna
 */
async function getUserGroups(userId) {
    const res = await pool.query("SELECT * FROM chemistry_group ORDER BY total_minutes DESC");
    return res.rows.filter((g) => {
        try {
            const members = JSON.parse(g.member_ids);
            return Array.isArray(members) && members.includes(userId);
        } catch (_) {
            return false;
        }
    });
}

/**
 * Mencari grup berdasarkan group_id
 */
async function getGroupById(groupId) {
    const res = await pool.query(
        "SELECT * FROM chemistry_group WHERE LOWER(group_id) = LOWER($1)",
        [groupId]
    );
    return res.rows[0] || null;
}

/**
 * Mengubah nama kustom grup
 */
async function updateGroupName(groupId, newName) {
    return pool.query(
        "UPDATE chemistry_group SET custom_name = $1 WHERE LOWER(group_id) = LOWER($2)",
        [newName, groupId]
    );
}

module.exports = {
    db: pool,
    pool,
    normalizePair,
    addDuoPointsTransaction,
    getAllUserDuos,
    getUserTopDuos,
    getDuoPoints,
    getDuoRank,
    getTopDuosLeaderboard,
    addGroupMinutesTransaction,
    getUserGroups,
    getGroupById,
    updateGroupName
};
