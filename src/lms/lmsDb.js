const pool = require("../database/db");

async function isModuleNotified(moduleId) {
    const result = await pool.query(
        `SELECT module_id FROM lms_notified_modules WHERE module_id = $1`,
        [moduleId]
    );

    return result.rows.length > 0;
}

async function saveNotifiedModule({ moduleId, courseName, title, type, link }) {
    await pool.query(`
        INSERT INTO lms_notified_modules (module_id, course_name, title, type, link, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (module_id) DO NOTHING
    `, [moduleId, courseName, title, type, link, Date.now()]);
}

module.exports = {
    isModuleNotified,
    saveNotifiedModule
};
