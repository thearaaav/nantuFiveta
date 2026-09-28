const pool = require("./db");

async function initDatabase() {
    try {
        await pool.query(`
            -- 1. Tasks Table
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

            -- 2. Users Table (Ekonomi & Saldo)
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                nus_balance BIGINT DEFAULT 0
            );

            -- 3. Chemistry Duo Table & Sequences
            CREATE SEQUENCE IF NOT EXISTS chemistry_duo_id_seq;
            CREATE TABLE IF NOT EXISTS chemistry_duo (
                id BIGINT PRIMARY KEY DEFAULT nextval('chemistry_duo_id_seq'),
                user1_id TEXT NOT NULL,
                user2_id TEXT NOT NULL,
                points BIGINT DEFAULT 0
            );
            ALTER TABLE chemistry_duo ALTER COLUMN id SET DEFAULT nextval('chemistry_duo_id_seq');
            CREATE UNIQUE INDEX IF NOT EXISTS idx_duo_user1_user2 ON chemistry_duo(user1_id, user2_id);
            CREATE INDEX IF NOT EXISTS idx_duo_user1 ON chemistry_duo(user1_id);
            CREATE INDEX IF NOT EXISTS idx_duo_user2 ON chemistry_duo(user2_id);
            CREATE INDEX IF NOT EXISTS idx_duo_points ON chemistry_duo(points DESC);

            -- 4. Chemistry Group Table & Sequences
            CREATE SEQUENCE IF NOT EXISTS chemistry_group_id_seq;
            CREATE TABLE IF NOT EXISTS chemistry_group (
                id BIGINT PRIMARY KEY DEFAULT nextval('chemistry_group_id_seq'),
                group_id TEXT UNIQUE NOT NULL,
                member_ids TEXT NOT NULL,
                total_minutes BIGINT DEFAULT 0,
                custom_name TEXT
            );
            ALTER TABLE chemistry_group ALTER COLUMN id SET DEFAULT nextval('chemistry_group_id_seq');
            CREATE UNIQUE INDEX IF NOT EXISTS idx_chemistry_group_id ON chemistry_group(group_id);

            -- 5. Students Table & Sequences (Random Kelompok / n!rkel)
            CREATE SEQUENCE IF NOT EXISTS students_id_seq;
            CREATE TABLE IF NOT EXISTS students (
                id BIGINT PRIMARY KEY DEFAULT nextval('students_id_seq'),
                nim TEXT,
                nama TEXT NOT NULL
            );
            ALTER TABLE students ALTER COLUMN id SET DEFAULT nextval('students_id_seq');
            CREATE UNIQUE INDEX IF NOT EXISTS idx_students_nim ON students(nim);

            -- 6. LMS Notified Modules Table
            CREATE TABLE IF NOT EXISTS lms_notified_modules (
                module_id TEXT PRIMARY KEY,
                course_name TEXT,
                title TEXT,
                type TEXT,
                link TEXT,
                created_at BIGINT
            );
            CREATE INDEX IF NOT EXISTS idx_lms_type ON lms_notified_modules(type);

            -- 7. Private Streaks Table & Sequences
            CREATE SEQUENCE IF NOT EXISTS private_streaks_id_seq;
            CREATE TABLE IF NOT EXISTS private_streaks (
                id INTEGER PRIMARY KEY DEFAULT nextval('private_streaks_id_seq'),
                channel_id VARCHAR NOT NULL,
                member_ids TEXT NOT NULL,
                streak_count INTEGER DEFAULT 1,
                last_active_date DATE
            );
            ALTER TABLE private_streaks ALTER COLUMN id SET DEFAULT nextval('private_streaks_id_seq');
            CREATE INDEX IF NOT EXISTS idx_streaks_channel ON private_streaks(channel_id);
        `);

        console.log("✅ PostgreSQL Railway database siap (seluruh tabel & indeks terverifikasi).");
    } catch (err) {
        console.error("❌ Gagal inisialisasi tabel PostgreSQL:", err?.message || err);
    }
}

module.exports = initDatabase;