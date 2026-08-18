const CHANNEL_ID = "1451483205176786996";


// ========================================
// ISI JADWAL
// ========================================

const SCHEDULE_TEXT =
"**Jadwal Kuliah**\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"**Senin**:\n" +
"07:30 - 10:00 | SG 5  | Sistem Informasi Geografi\n" +
"15:30 - 17:30 | JTI 2 | Arsitektur Sistem Komputer\n" +
"────────────────────────────────────────\n" +
"**Selasa**:\n" +
"07:30 - 10:00 | SG 4  | Rekayasa API                \n" +
"10:00 - 12:00 | JTI 3 | Interaksi Manusia Komputer  \n" +
"13:00 - 15:30 | SG 5  | Basis Data                  \n" +
"────────────────────────────────────────\n" +
"**Kamis**:\n" +
"10:10 - 11:30 | JTI 2 | Kajian Lingkungan Hidup\n" +
"15:30 - 18:00 | SG -  | Rekayasa Perangkat Lunak\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"**Catatan**: kurangilah bermain gem onlien\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";


// ========================================
// KIRIM / UPDATE JADWAL
// ========================================

async function sendSchedule(client){

    try{

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


        // ========================================
        // CARI PESAN JADWAL BOT
        // ========================================

        const messages =
            await channel.messages.fetch({
                limit: 50
            });


        const existingSchedule =
            messages.find(
                message =>
                    message.author.id === client.user.id &&
                    message.content.includes(
                        "Jadwal Kuliah"
                    )
            );


        // ========================================
        // JIKA SUDAH ADA → UPDATE
        // ========================================

        if(existingSchedule){

            await existingSchedule.edit(
                SCHEDULE_TEXT
            );


            console.log(
                "✏️ Jadwal kuliah berhasil diperbarui."
            );

            return;

        }


        // ========================================
        // JIKA BELUM ADA → KIRIM BARU
        // ========================================

        await channel.send(
            SCHEDULE_TEXT
        );


        console.log(
            "✅ Jadwal kuliah berhasil dikirim."
        );


    } catch(err){

        console.error(
            "❌ Gagal mengirim/memperbarui jadwal:",
            err
        );

    }

}


module.exports = {
    sendSchedule
};