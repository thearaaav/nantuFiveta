const pool = require("./db");

/**
 * Mengambil seluruh data mahasiswa (semua baris dianggap aktif)
 */
async function getAllStudents() {
    const result = await pool.query(`
        SELECT id, nim, nama
        FROM students
        ORDER BY id ASC
    `);

    return result.rows;
}

module.exports = {
    db: pool,
    getAllStudents
};
