const pool = require("./db");

/**
 * Menormalkan urutan ID pasangan agar selalu user1_id < user2_id
 */
function normalizePair(idA, idB) {
    return idA < idB ? [idA, idB] : [idB, idA];
}

/**
 * Menambahkan poin untuk pasangan duo dan menambah saldo nus_balance.
 * Semua perubahan dijalankan dalam satu transaksi PostgreSQL.
 */
async function addDuoPointsTransaction(pairs) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const updatedUsers = new Set();

        for (const [idA, idB] of pairs) {
            const [u1, u2] = normalizePair(idA, idB);

            await client.query(
                `INSERT INTO chemistry_duo (user1_id, user2_id, points)
                 VALUES ($1, $2, 1)
                 ON CONFLICT (user1_id, user2_id)
                 DO UPDATE SET points = chemistry_duo.points + 1`,
                [u1, u2]
            );

            updatedUsers.add(u1);
            updatedUsers.add(u2);
        }

        for (const userId of updatedUsers) {
            await client.query(
                `INSERT INTO users (user_id, nus_balance)
                 VALUES ($1, 1)
                 ON CONFLICT (user_id)
                 DO UPDATE SET nus_balance = users.nus_balance + 1`,
                [userId]
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getDuoRank(userA, userB) {
    const [u1, u2] = normalizePair(userA, userB);
    const row = await pool.query(
        `SELECT points FROM chemistry_duo WHERE user1_id = $1 AND user2_id = $2`,
        [u1, u2]
    );

    if (!row.rows[0] || row.rows[0].points <= 0) return "-";

    const rankRow = await pool.query(
        `SELECT COUNT(*) + 1 AS rank FROM chemistry_duo WHERE points > $1`,
        [row.rows[0].points]
    );

    return rankRow.rows[0] ? Number(rankRow.rows[0].rank) : 1;
}

async function getUserTopDuos(userId, limit = 3) {
    const rows = await pool.query(
        `SELECT * FROM chemistry_duo
         WHERE (user1_id = $1 OR user2_id = $1) AND points > 0
         ORDER BY points DESC
         LIMIT $2`,
        [userId, limit]
    );

    return Promise.all(rows.rows.map(async (r) => {
        const rankRow = await pool.query(
            `SELECT COUNT(*) + 1 AS rank FROM chemistry_duo WHERE points > $1`,
            [r.points]
        );

        return {
            ...r,
            rank: rankRow.rows[0] ? Number(rankRow.rows[0].rank) : 1
        };
    }));
}

async function getDuoPoints(userA, userB) {
    const [u1, u2] = normalizePair(userA, userB);
    const row = await pool.query(
        `SELECT points FROM chemistry_duo WHERE user1_id = $1 AND user2_id = $2`,
        [u1, u2]
    );

    return row.rows[0] ? Number(row.rows[0].points) : 0;
}

async function getAllUserDuos(userId) {
    const rows = await pool.query(
        `SELECT * FROM chemistry_duo
         WHERE (user1_id = $1 OR user2_id = $1) AND points > 0
         ORDER BY points DESC`,
        [userId]
    );

    return Promise.all(rows.rows.map(async (r) => {
        const rankRow = await pool.query(
            `SELECT COUNT(*) + 1 AS rank FROM chemistry_duo WHERE points > $1`,
            [r.points]
        );

        return {
            ...r,
            rank: rankRow.rows[0] ? Number(rankRow.rows[0].rank) : 1
        };
    }));
}

async function getTopDuosLeaderboard(limit = 10) {
    const result = await pool.query(
        `SELECT * FROM chemistry_duo
         WHERE points > 0
         ORDER BY points DESC
         LIMIT $1`,
        [limit]
    );

    return result.rows;
}

module.exports = {
    db: pool,
    addDuoPointsTransaction,
    getAllUserDuos,
    getUserTopDuos,
    getDuoPoints,
    getDuoRank,
    getTopDuosLeaderboard
};
