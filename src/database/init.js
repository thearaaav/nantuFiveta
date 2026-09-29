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

        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            nus_balance INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS chemistry_duo (
            id BIGSERIAL PRIMARY KEY,
            user1_id TEXT NOT NULL,
            user2_id TEXT NOT NULL,
            points INTEGER DEFAULT 0,
            UNIQUE(user1_id, user2_id)
        );

        CREATE INDEX IF NOT EXISTS idx_duo_user1 ON chemistry_duo(user1_id);
        CREATE INDEX IF NOT EXISTS idx_duo_user2 ON chemistry_duo(user2_id);
        CREATE INDEX IF NOT EXISTS idx_duo_points ON chemistry_duo(points DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_chemistry_duo_pair ON chemistry_duo(user1_id, user2_id);

        CREATE TABLE IF NOT EXISTS chemistry_group (
            id BIGSERIAL PRIMARY KEY,
            group_id TEXT UNIQUE NOT NULL,
            member_ids TEXT NOT NULL,
            total_minutes INTEGER DEFAULT 0,
            custom_name TEXT
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_chemistry_group_group_id ON chemistry_group(group_id);

        CREATE TABLE IF NOT EXISTS students (
            id BIGSERIAL PRIMARY KEY,
            nim VARCHAR UNIQUE,
            nama VARCHAR NOT NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_students_nim ON students(nim);

        CREATE TABLE IF NOT EXISTS private_streaks (
            id BIGSERIAL PRIMARY KEY,
            channel_id TEXT NOT NULL,
            member_ids TEXT NOT NULL,
            streak_count INTEGER DEFAULT 1,
            last_active_date DATE,
            status VARCHAR(20) DEFAULT 'active',
            grace_used INTEGER DEFAULT 0,
            grace_start_date DATE,
            last_warning_date DATE
        );

        ALTER TABLE private_streaks ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE private_streaks ADD COLUMN IF NOT EXISTS grace_used INTEGER DEFAULT 0;
        ALTER TABLE private_streaks ADD COLUMN IF NOT EXISTS grace_start_date DATE;
        ALTER TABLE private_streaks ADD COLUMN IF NOT EXISTS last_warning_date DATE;

        CREATE TABLE IF NOT EXISTS lms_notified_modules (
            module_id TEXT PRIMARY KEY,
            course_name TEXT,
            title TEXT,
            type TEXT,
            link TEXT,
            created_at BIGINT
        );

        CREATE INDEX IF NOT EXISTS idx_lms_type ON lms_notified_modules(type);

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'chemistry_duo'
                  AND column_name = 'id'
                  AND column_default LIKE 'nextval%'
            ) THEN
                CREATE SEQUENCE IF NOT EXISTS chemistry_duo_id_seq;
                PERFORM setval('chemistry_duo_id_seq', COALESCE((SELECT MAX(id) FROM chemistry_duo), 0) + 1, false);
                ALTER TABLE chemistry_duo ALTER COLUMN id SET DEFAULT nextval('chemistry_duo_id_seq');
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'chemistry_group'
                  AND column_name = 'id'
                  AND column_default LIKE 'nextval%'
            ) THEN
                CREATE SEQUENCE IF NOT EXISTS chemistry_group_id_seq;
                PERFORM setval('chemistry_group_id_seq', COALESCE((SELECT MAX(id) FROM chemistry_group), 0) + 1, false);
                ALTER TABLE chemistry_group ALTER COLUMN id SET DEFAULT nextval('chemistry_group_id_seq');
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'students'
                  AND column_name = 'id'
                  AND column_default LIKE 'nextval%'
            ) THEN
                CREATE SEQUENCE IF NOT EXISTS students_id_seq;
                PERFORM setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 0) + 1, false);
                ALTER TABLE students ALTER COLUMN id SET DEFAULT nextval('students_id_seq');
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'private_streaks'
                  AND column_name = 'id'
                  AND column_default LIKE 'nextval%'
            ) THEN
                CREATE SEQUENCE IF NOT EXISTS private_streaks_id_seq;
                PERFORM setval('private_streaks_id_seq', COALESCE((SELECT MAX(id) FROM private_streaks), 0) + 1, false);
                ALTER TABLE private_streaks ALTER COLUMN id SET DEFAULT nextval('private_streaks_id_seq');
            END IF;
        END $$;
    `);

    console.log("✅ PostgreSQL database siap.");
}

module.exports = initDatabase;
