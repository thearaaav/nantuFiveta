const fs = require("fs");
const path = require("path");


// ========================================
// PENGATURAN
// ========================================

const CHANNEL_ID = "1451483205176786996";

const MESSAGE_FILE =
    path.join(__dirname, "../data/scheduleMessage.json");


// ========================================
// ISI JADWAL
// ========================================

const SCHEDULE_TEXT =
"Jadwal Kuliah\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"**Senin**:\n" +
"07:30 - 10:00 |  Sistem Informasi Geografi   | SG 5\n" +
"15:30 - 17:30 |  Arsitektur Sistem Komputer  | JTI 2\n" +
"────────────────────────────────────────────────────────────\n" +
"**Selasa**:\n" +
"07:30 - 10:00 |  Rekayasa API                | SG 4\n" +
"10:00 - 12:00 |  Interaksi Manusia Komputer  | JTI 3\n" +
"13:00 - 15:30 |  Basis Data                  | SG 5\n" +
"15:30 - 18:00 |  Rekayasa Perangkat Lunak    | SG 7\n" +
"────────────────────────────────────────────────────────────\n" +
"**Kamis**:\n" +
"10:10 - 11:30 |  Kajian Lingkungan Hidup     | JTI 2\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"**Jadwal Praktikum**:\n-\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

// ========================================
// CEK / BUAT FOLDER DATA
// ========================================

function ensureDataFolder(){

    const folder =
        path.dirname(MESSAGE_FILE);

    if(!fs.existsSync(folder)){
        fs.mkdirSync(
            folder,
            { recursive: true }
        );
    }

}


// ========================================
// CEK PESAN JADWAL
// ========================================

async function sendSchedule(client){

    try{

        ensureDataFolder();


        const channel =
            await client.channels.fetch(
                CHANNEL_ID
            );


        if(!channel){

            console.error(
                "❌ Channel jadwal tidak ditemukan."
            );

            return;

        }


        let messageId = null;


        // =========================
        // BACA ID PESAN LAMA
        // =========================

        if(fs.existsSync(MESSAGE_FILE)){

            const data =
                JSON.parse(
                    fs.readFileSync(
                        MESSAGE_FILE,
                        "utf8"
                    )
                );

            messageId =
                data.messageId || null;

        }


        // =========================
        // CEK PESAN MASIH ADA
        // =========================

        if(messageId){

            try{

                await channel.messages.fetch(
                    messageId
                );


                console.log(
                    "📚 Jadwal masih ada. Tidak mengirim ulang."
                );

                return;

            } catch(err){

                console.log(
                    "⚠️ Pesan jadwal tidak ditemukan. Mengirim ulang..."
                );

            }

        }


        // =========================
        // KIRIM PESAN BARU
        // =========================

        const message =
            await channel.send(
                SCHEDULE_TEXT
            );


        // =========================
        // SIMPAN ID PESAN
        // =========================

        fs.writeFileSync(

            MESSAGE_FILE,

            JSON.stringify(
                {
                    messageId: message.id
                },
                null,
                4
            )

        );


        console.log(
            "✅ Jadwal kuliah berhasil dikirim."
        );


    } catch(err){

        console.error(
            "❌ Gagal mengirim jadwal:",
            err
        );

    }

}


module.exports = {
    sendSchedule
};