const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Pakai file SQLite yang sama dengan modul lain di folder data
const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "database.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nim VARCHAR UNIQUE,
        nama VARCHAR NOT NULL
    );
`);

/**
 * Mengambil seluruh data mahasiswa (semua baris dianggap aktif)
 */
function getAllStudents() {
    return db.prepare(`
        SELECT id, nim, nama
        FROM students
        ORDER BY id ASC
    `).all();
}

module.exports = {
    db,
    getAllStudents
};
