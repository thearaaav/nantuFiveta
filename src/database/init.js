const pool = require("./db");

async function initDatabase() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            subject TEXT,
            deadline TEXT,
            time TEXT,
            description TEXT,
            created_at BIGINT,
            reminder_sent JSONB DEFAULT '[]'::jsonb
        );
    `);

    console.log("✅ PostgreSQL database siap.");

}

module.exports = initDatabase;