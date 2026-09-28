require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

// Path presisi ke SQLite kamu
const dbPath = 'D:/nantuFive/data/database.db';
const dbSqlite = new sqlite3.Database(dbPath);

// Connection String Public Railway
const pgClient = new Client({
    connectionString: 'postgresql://postgres:TzQJTbQnipUdXzeHGRkspUBOGUTfdpoC@switchyard.proxy.rlwy.net:39948/railway',
    ssl: { rejectUnauthorized: false }
});

// Fungsi pembantu konversi tipe data SQLite -> PostgreSQL
function mapSqliteTypeToPg(type) {
    if (!type) return 'TEXT';
    const t = type.toUpperCase();
    if (t.includes('INT')) return 'BIGINT';
    if (t.includes('CHAR') || t.includes('CLOB') || t.includes('TEXT')) return 'TEXT';
    if (t.includes('BLOB')) return 'BYTEA';
    if (t.includes('REAL') || t.includes('FLOA') || t.includes('DOUB')) return 'DOUBLE PRECISION';
    return 'TEXT';
}

async function migrateAllTables() {
    try {
        await pgClient.connect();
        console.log('⚡ Terhubung ke PostgreSQL Railway...');

        // 1. Ambil semua nama tabel dari SQLite (kecuali sistem internal sqlite)
        dbSqlite.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';", [], async (err, tables) => {
            if (err) {
                console.error('❌ Gagal membaca daftar tabel SQLite:', err.message);
                return;
            }

            console.log(`📋 Ditemukan ${tables.length} tabel untuk dipindahkan.`);

            for (const tableObj of tables) {
                const tableName = tableObj.name;
                console.log(`\n⏳ Memproses tabel: [${tableName}]...`);

                // A. Ambil struktur kolom tabel SQLite
                const columns = await new Promise((resolve, reject) => {
                    dbSqlite.all(`PRAGMA table_info("${tableName}")`, [], (e, res) => e ? reject(e) : resolve(res));
                });

                // B. Buat DDL Query untuk CREATE TABLE di PostgreSQL
                const colDefinitions = columns.map(col => {
                    let colDef = `"${col.name}" ${mapSqliteTypeToPg(col.type)}`;
                    if (col.pk === 1) colDef += ' PRIMARY KEY';
                    return colDef;
                }).join(', ');

                const createTableQuery = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefinitions});`;
                await pgClient.query(createTableQuery);
                console.log(`  └─ ✅ Tabel "${tableName}" siap di PostgreSQL.`);

                // C. Ambil semua baris data dari SQLite
                const rows = await new Promise((resolve, reject) => {
                    dbSqlite.all(`SELECT * FROM "${tableName}"`, [], (e, res) => e ? reject(e) : resolve(res));
                });

                if (rows.length === 0) {
                    console.log(`  └─ ℹ️ Tabel "${tableName}" kosong (0 data). Skipping insert.`);
                    continue;
                }

                // D. Insert data ke PostgreSQL
                let insertedCount = 0;
                for (const row of rows) {
                    const keys = Object.keys(row);
                    const colsEscaped = keys.map(k => `"${k}"`).join(', ');
                    const paramPlaceholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
                    const values = keys.map(k => row[k]);

                    const insertQuery = `INSERT INTO "${tableName}" (${colsEscaped}) VALUES (${paramPlaceholders}) ON CONFLICT DO NOTHING;`;
                    await pgClient.query(insertQuery, values);
                    insertedCount++;
                }

                console.log(`  └─ 🎉 Berhasil memindahkan ${insertedCount} data ke "${tableName}".`);
            }

            console.log('\n==================================================');
            console.log('✅ MIGRASI TOTAL SELESAI! Semua tabel & data berhasil dipindah ke Railway.');
            console.log('==================================================');

            await pgClient.end();
            dbSqlite.close();
        });
    } catch (error) {
        console.error('❌ Error Migrasi:', error);
    }
}

migrateAllTables();