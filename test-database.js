require("dotenv").config();

const {
    testDatabase
} = require("./src/services/database");

(async () => {

    try {

        await testDatabase();

        console.log("🎉 Database siap digunakan.");

    } catch (err) {

        console.error(
            "❌ Gagal terhubung ke database:",
            err.message
        );

    } finally {

        process.exit();

    }

})();