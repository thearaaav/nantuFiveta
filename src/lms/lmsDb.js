const pool = require("../database/db");

/**
 * Memeriksa apakah suatu modul LMS sudah pernah dinotifikasikan
 * @param {string} moduleId
 * @returns {Promise<boolean>}
 */
async function isModuleNotified(moduleId) {
    const res = await pool.query(`
        SELECT module_id FROM lms_notified_modules WHERE module_id = $1
    `, [moduleId]);
    return res.rows.length > 0;
}

/**
 * Menyimpan modul LMS yang baru dinotifikasikan ke PostgreSQL Railway
 * @param {Object} data
 * @param {string} data.moduleId
 * @param {string} data.courseName
 * @param {string} data.title
 * @param {string} data.type
 * @param {string} data.link
 */
async function saveNotifiedModule({ moduleId, courseName, title, type, link }) {
    await pool.query(`
        INSERT INTO lms_notified_modules (module_id, course_name, title, type, link, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (module_id) DO NOTHING
    `, [moduleId, courseName, title, type, link, Date.now()]);
}

module.exports = {
    db: pool,
    pool,
    isModuleNotified,
    saveNotifiedModule
};
