const sqlite3 = require('sqlite3').verbose();

// GANTI DENGAN PATH ASLI DARI GUI SQLITE KAMU
const dbPath = 'D:/nantuFive/src/data/database.db'; // Pasang lokasi persis dari GUI di sini

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Gagal membuka database:', err.message);
    } else {
        console.log('✅ Berhasil terhubung ke file SQLite!');
    }
});

db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, tables) => {
    if (err) return console.error(err);
    console.log('📋 Tabel yang ditemukan:', tables);
});