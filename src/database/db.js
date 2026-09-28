require("dotenv").config(); // Memastikan file .env terbaca saat dijalankan di komputer lokal
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

// Peringatan awal jika DATABASE_URL tidak terdeteksi
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

module.exports = pool;