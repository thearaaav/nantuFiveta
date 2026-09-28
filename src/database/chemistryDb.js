const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Pastikan folder data ada
const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "database.db");
const db = new Database(dbPath);

// Aktifkan mode WAL untuk performa dan konkurensi optimal
db.pragma("journal_mode = WAL");

// Inisialisasi tabel-tabel SQLite untuk Chemistry Duo System
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        nus_balance INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS chemistry_duo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_id TEXT NOT NULL,
        user2_id TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        UNIQUE(user1_id, user2_id)
    );

    CREATE INDEX IF NOT EXISTS idx_duo_user1 ON chemistry_duo(user1_id);
    CREATE INDEX IF NOT EXISTS idx_duo_user2 ON chemistry_duo(user2_id);
    CREATE INDEX IF NOT EXISTS idx_duo_points ON chemistry_duo(points DESC);
`);

/**
 * Menormalkan urutan ID pasangan agar selalu user1_id < user2_id
 */
function normalizePair(idA, idB) {
    return idA < idB ? [idA, idB] : [idB, idA];
}

// Prepared Statements
const insertOrUpdateDuoStmt = db.prepare(`
    INSERT INTO chemistry_duo (user1_id, user2_id, points)
    VALUES (?, ?, 1)
    ON CONFLICT(user1_id, user2_id) DO UPDATE SET points = points + 1
`);

const insertOrUpdateUserBalanceStmt = db.prepare(`
    INSERT INTO users (user_id, nus_balance)
    VALUES (?, 1)
    ON CONFLICT(user_id) DO UPDATE SET nus_balance = nus_balance + 1
`);

/**
 * Menambahkan poin untuk pasangan duo dan menambah saldo nus_balance (Transaction)
 */
const addDuoPointsTransaction = db.transaction((pairs) => {
    const updatedUsers = new Set();

    for (const [idA, idB] of pairs) {
        const [u1, u2] = normalizePair(idA, idB);
        insertOrUpdateDuoStmt.run(u1, u2);
        updatedUsers.add(u1);
        updatedUsers.add(u2);
    }

    for (const userId of updatedUsers) {
        insertOrUpdateUserBalanceStmt.run(userId);
    }
});

/**
 * Menghitung ranking leaderboard untuk pasangan duo tertentu
 */
function getDuoRank(userA, userB) {
    const [u1, u2] = normalizePair(userA, userB);
    const row = db.prepare(`
        SELECT points FROM chemistry_duo WHERE user1_id = ? AND user2_id = ?
    `).get(u1, u2);

    if (!row || row.points <= 0) return "-";

    const rankRow = db.prepare(`
        SELECT COUNT(*) + 1 AS rank FROM chemistry_duo WHERE points > ?
    `).get(row.points);

    return rankRow ? rankRow.rank : 1;
}

/**
 * Mengambil Top 3 Duo Chemistry milik seorang pengguna beserta rank leaderboard
 */
function getUserTopDuos(userId, limit = 3) {
    const rows = db.prepare(`
        SELECT * FROM chemistry_duo
        WHERE (user1_id = ? OR user2_id = ?) AND points > 0
        ORDER BY points DESC
        LIMIT ?
    `).all(userId, userId, limit);

    return rows.map((r) => {
        const rankRow = db.prepare(`
            SELECT COUNT(*) + 1 AS rank FROM chemistry_duo WHERE points > ?
        `).get(r.points);

        return {
            ...r,
            rank: rankRow ? rankRow.rank : 1
        };
    });
}

/**
 * Mengambil poin chemistry antara dua pengguna spesifik
 */
function getDuoPoints(userA, userB) {
    const [u1, u2] = normalizePair(userA, userB);
    const row = db.prepare(`
        SELECT points FROM chemistry_duo WHERE user1_id = ? AND user2_id = ?
    `).get(u1, u2);
    return row ? row.points : 0;
}

/**
 * Mengambil semua pasangan Duo Chemistry milik seorang pengguna beserta rank leaderboard
 */
function getAllUserDuos(userId) {
    const rows = db.prepare(`
        SELECT * FROM chemistry_duo
        WHERE (user1_id = ? OR user2_id = ?) AND points > 0
        ORDER BY points DESC
    `).all(userId, userId);

    return rows.map((r) => {
        const rankRow = db.prepare(`
            SELECT COUNT(*) + 1 AS rank FROM chemistry_duo WHERE points > ?
        `).get(r.points);

        return {
            ...r,
            rank: rankRow ? rankRow.rank : 1
        };
    });
}

/**
 * Mengambil Top 10 Pasangan Duo dengan Poin tertinggi di server
 */
function getTopDuosLeaderboard(limit = 10) {
    return db.prepare(`
        SELECT * FROM chemistry_duo
        WHERE points > 0
        ORDER BY points DESC
        LIMIT ?
    `).all(limit);
}

module.exports = {
    db,
    addDuoPointsTransaction,
    getAllUserDuos,
    getUserTopDuos,
    getDuoPoints,
    getDuoRank,
    getTopDuosLeaderboard
};
