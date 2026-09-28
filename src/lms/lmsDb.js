const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Gunakan file database lokal SQLite di data/database.db
const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "database.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Inisialisasi tabel notifikasi modul LMS
db.exec(`
    CREATE TABLE IF NOT EXISTS lms_notified_modules (
        module_id TEXT PRIMARY KEY,
        course_name TEXT,
        title TEXT,
        type TEXT,
        link TEXT,
        created_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_lms_type ON lms_notified_modules(type);
`);

const checkModuleStmt = db.prepare(`
    SELECT module_id FROM lms_notified_modules WHERE module_id = ?
`);

const insertModuleStmt = db.prepare(`
    INSERT INTO lms_notified_modules (module_id, course_name, title, type, link, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
`);

/**
 * Memeriksa apakah suatu modul LMS sudah pernah dinotifikasikan
 * @param {string} moduleId
 * @returns {boolean}
 */
function isModuleNotified(moduleId) {
    const row = checkModuleStmt.get(moduleId);
    return Boolean(row);
}

/**
 * Menyimpan modul LMS yang baru dinotifikasikan
 * @param {Object} data
 * @param {string} data.moduleId
 * @param {string} data.courseName
 * @param {string} data.title
 * @param {string} data.type
 * @param {string} data.link
 */
function saveNotifiedModule({ moduleId, courseName, title, type, link }) {
    insertModuleStmt.run(moduleId, courseName, title, type, link, Date.now());
}

module.exports = {
    isModuleNotified,
    saveNotifiedModule
};
