const pool = require("./db");

/**
 * Mengambil seluruh data mahasiswa dari PostgreSQL Railway
 * @returns {Promise<Array<{ id: number|string, nim: string, nama: string }>>}
 */
async function getAllStudents() {
    const res = await pool.query(`
        SELECT id, nim, nama
        FROM students
        ORDER BY id ASC
    `);
    return res.rows;
}

module.exports = {
    db: pool,
    pool,
    getAllStudents
};
