const taskBoardService =
    require("../services/taskBoardService");

const reminderService =
    require("../services/reminderService");

const scheduleService =
    require("../services/scheduleService");

function startReminderScheduler(client){


    setInterval(async()=>{


        const now =
            new Date();



        // WITA UTC+8

        const wita =
            new Date(
                now.toLocaleString(
                    "en-US",
                    {
                        timeZone:
                        "Asia/Makassar"
                    }
                )
            );



        const hour =
            wita.getHours();


        const minute =
            wita.getMinutes();



        if(
            minute !== 0
        )
            return;



        if(
            hour === 10 ||
            hour === 18
        ){


            console.log(
                "🔔 Mengecek reminder:",
                `${hour}:00 WITA`
            );



            await reminderService.checkReminder(
                client,
                hour
            );


        }


    },
    60 * 1000
    );

}

module.exports = {

    name: "clientReady",

    async execute(client){


        console.log(
            `🤖 ${client.user.tag} siap!`
        );

        client.user.setPresence({

    activities: [
        {
            name:
                "Kalo torang dulu dek.",
            type: 2
        }
    ],

    status:
        "online"

});

await scheduleService.sendSchedule(client);

        startReminderScheduler(
            client
        );


        console.log(
            "⏰ Reminder scheduler aktif."
        );

        try {


            await taskBoardService.syncTaskBoard(
                client
            );


            console.log(
                "✅ Task board berhasil disinkronkan."
            );


            await reminderService.checkReminder(
                client
            );


            console.log(
                "✅ Reminder berhasil dicek."
            );


        } catch(err){


            console.error(
                "❌ Gagal startup service:",
                err
            );


        }

    }

};