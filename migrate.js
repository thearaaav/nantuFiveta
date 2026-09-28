require("dotenv").config();

const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { Client } = require("pg");

const dbPath = process.env.SQLITE_DB_PATH
    ? path.resolve(process.env.SQLITE_DB_PATH)
    : path.join(__dirname, "data", "database.db");

if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL belum diatur.");
    process.exit(1);
}

const dbSqlite = new sqlite3.Database(dbPath);
const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("railway.internal")
        ? false
        : { rejectUnauthorized: false }
});

function sqliteAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        dbSqlite.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function migrateTable(tableName, columns, rows, conflict = "DO NOTHING") {
    if (!rows.length) {
        console.log(`  └─ ℹ️ ${tableName}: 0 data, dilewati.`);
        return;
    }

    const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
    let inserted = 0;

    for (const row of rows) {
        const values = columns.map((column) => row[column]);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

        await pgClient.query(
            `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT ${conflict}`,
            values
        );
        inserted++;
    }

    console.log(`  └─ ✅ ${tableName}: ${inserted} baris diproses.`);
}

async function resetSequence(tableName, column = "id") {
    const sequenceResult = await pgClient.query(`
        SELECT pg_get_serial_sequence($1, $2) AS sequence
    `, [tableName, column]);

    const sequence = sequenceResult.rows[0]?.sequence;
    if (!sequence) return;

    await pgClient.query(`
        SELECT setval($1::regclass, COALESCE((SELECT MAX("${column}") FROM "${tableName}"), 1), true)
    `, [sequence]);
}


async function ensurePostgresSchema() {
    await pgClient.query(`
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
        CREATE UNIQUE INDEX IF NOT EXISTS idx_chemistry_duo_pair ON chemistry_duo(user1_id, user2_id);

        CREATE TABLE IF NOT EXISTS chemistry_group (
            id BIGSERIAL PRIMARY KEY,
            group_id TEXT UNIQUE NOT NULL,
            member_ids TEXT NOT NULL,
            total_minutes INTEGER DEFAULT 0,
            custom_name TEXT
        );

        CREATE TABLE IF NOT EXISTS students (
            id BIGSERIAL PRIMARY KEY,
            nim VARCHAR UNIQUE,
            nama VARCHAR NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_students_nim ON students(nim);

        CREATE TABLE IF NOT EXISTS lms_notified_modules (
            module_id TEXT PRIMARY KEY,
            course_name TEXT,
            title TEXT,
            type TEXT,
            link TEXT,
            created_at BIGINT
        );

        CREATE TABLE IF NOT EXISTS private_streaks (
            id BIGSERIAL PRIMARY KEY,
            channel_id TEXT NOT NULL,
            member_ids TEXT NOT NULL,
            streak_count INTEGER DEFAULT 1,
            last_active_date TEXT
        );
    `);
}

async function migrateAllTables() {
    try {
        console.log(`📦 SQLite source: ${dbPath}`);
        await pgClient.connect();
        console.log("⚡ Terhubung ke PostgreSQL Railway.");
        await ensurePostgresSchema();
        console.log("🧱 Schema PostgreSQL siap.");

        const tables = await sqliteAll(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);

        const available = new Set(tables.map((table) => table.name));
        const expectedTables = [
            "users",
            "chemistry_duo",
            "chemistry_group",
            "students",
            "lms_notified_modules",
            "private_streaks"
        ];

        for (const table of expectedTables) {
            if (!available.has(table)) {
                console.log(`ℹ️ ${table}: tidak ada di SQLite, dilewati.`);
            }
        }

        await pgClient.query("BEGIN");

        if (available.has("users")) {
            console.log("\n⏳ Memigrasikan users...");
            await migrateTable(
                "users",
                ["user_id", "nus_balance"],
                await sqliteAll("SELECT user_id, nus_balance FROM users")
            );
        }

        if (available.has("chemistry_duo")) {
            console.log("\n⏳ Memigrasikan chemistry_duo...");
            await migrateTable(
                "chemistry_duo",
                ["id", "user1_id", "user2_id", "points"],
                await sqliteAll("SELECT id, user1_id, user2_id, points FROM chemistry_duo")
            );
            await resetSequence("chemistry_duo");
        }

        if (available.has("chemistry_group")) {
            console.log("\n⏳ Memigrasikan chemistry_group...");
            await migrateTable(
                "chemistry_group",
                ["id", "group_id", "member_ids", "total_minutes", "custom_name"],
                await sqliteAll("SELECT id, group_id, member_ids, total_minutes, custom_name FROM chemistry_group")
            );
            await resetSequence("chemistry_group");
        }

        if (available.has("students")) {
            console.log("\n⏳ Memigrasikan students...");
            await migrateTable(
                "students",
                ["id", "nim", "nama"],
                await sqliteAll("SELECT id, nim, nama FROM students")
            );
            await resetSequence("students");
        }

        if (available.has("lms_notified_modules")) {
            console.log("\n⏳ Memigrasikan lms_notified_modules...");
            await migrateTable(
                "lms_notified_modules",
                ["module_id", "course_name", "title", "type", "link", "created_at"],
                await sqliteAll("SELECT module_id, course_name, title, type, link, created_at FROM lms_notified_modules")
            );
        }

        if (available.has("private_streaks")) {
            console.log("\n⏳ Memigrasikan private_streaks...");
            await migrateTable(
                "private_streaks",
                ["id", "channel_id", "member_ids", "streak_count", "last_active_date"],
                await sqliteAll("SELECT id, channel_id, member_ids, streak_count, last_active_date FROM private_streaks")
            );
            await resetSequence("private_streaks");
        }

        await pgClient.query("COMMIT");

        console.log("\n==================================================");
        console.log("✅ MIGRASI SQLITE → POSTGRESQL SELESAI");
        console.log("   Data lama dipertahankan; baris yang sudah ada dilewati.");
        console.log("==================================================");
    } catch (error) {
        try {
            await pgClient.query("ROLLBACK");
        } catch (_) {}

        console.error("❌ Migrasi gagal:", error);
        process.exitCode = 1;
    } finally {
        await pgClient.end().catch(() => {});
        dbSqlite.close();
    }
}

migrateAllTables();
