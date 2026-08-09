const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("error", (err) => {
    console.error("❌ PostgreSQL error:", err);
});

async function testDatabase() {

    const result = await pool.query(
        "SELECT NOW() AS time"
    );

    console.log(
        `✅ Database terhubung: ${result.rows[0].time}`
    );

}

module.exports = {
    pool,
    testDatabase
};