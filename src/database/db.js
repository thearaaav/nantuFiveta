require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERROR: DATABASE_URL tidak ditemukan di Environment Variables!");
}

// Cek apakah koneksi menggunakan URL internal Railway (.railway.internal)
const isInternalRailway = connectionString?.includes("railway.internal");

const pool = new Pool({
    connectionString: connectionString,
    // Matikan SSL jika pakai jaringan internal Railway, aktifkan SSL jika dari luar (Public URL / Lokal)
    ssl: isInternalRailway ? false : { rejectUnauthorized: false },
});

// Helper query function
const query = (text, params) => pool.query(text, params);

module.exports = pool;
module.exports.pool = pool;
module.exports.query = query;