const {
    EmbedBuilder
} = require("discord.js");


const taskService =
    require("./taskService");


const {
    taskNotifChannel
} = require("../config/channels");


const {
    memberClassRole
} = require("../config/roles");


const {
    parseDeadline
} = require("../utils/dateUtils");




async function checkReminder(
    client,
    hour
){


    const tasks =
        await taskService.getTasks();



    const groups = {

        "Besok": [],

        "3 Hari Lagi": [],

        "7 Hari Lagi": [],

        "14 Hari Lagi": []

    };



    for(const task of tasks){


        if(!task.reminderSent){

            task.reminderSent = [];

        }



        const deadline =
    parseDeadline(
        task.deadline,
        task.time
    );


if(!deadline)
    continue;



// =========================
// Skip deadline yang lewat
// =========================

const now =
    new Date();


if(deadline < now){

    continue;

}



        const today =
            new Date();


        today.setHours(
            0,
            0,
            0,
            0
        );



        const deadlineDate =
            new Date(deadline);


        deadlineDate.setHours(
            0,
            0,
            0,
            0
        );



        const days =
            Math.round(
                (
                    deadlineDate -
                    today
                )
                /
                (
                    1000 *
                    60 *
                    60 *
                    24
                )
            );



        const created =
            new Date(
                task.createdAt
            );


        created.setHours(
            0,
            0,
            0,
            0
        );



        const age =
            Math.round(
                (
                    today -
                    created
                )
                /
                (
                    1000 *
                    60 *
                    60 *
                    24
                )
            );



        if(age <= 0)
            continue;



        let key;



        // ===================
        // H-14
        // ===================

        if(
            days === 14 &&
            hour === 10
        ){

            key = "14-10";

            if(
                !task.reminderSent.includes(key)
            ){

                groups["14 Hari Lagi"]
                .push(task);

            }

        }



        // ===================
        // H-7
        // ===================

        if(
            days === 7 &&
            hour === 10
        ){

            key = "7-10";


            if(
                !task.reminderSent.includes(key)
            ){

                groups["7 Hari Lagi"]
                .push(task);

            }

        }



        // ===================
        // H-3
        // ===================

        if(days === 3){


            key =
                `3-${hour}`;


            if(
                (hour === 10 ||
                 hour === 18)
                &&
                !task.reminderSent.includes(key)
            ){

                groups["3 Hari Lagi"]
                .push(task);

            }

        }



        // ===================
        // H-1
        // ===================

        if(days === 1){


            key =
                `1-${hour}`;


            if(
                (hour === 10 ||
                 hour === 18)
                &&
                !task.reminderSent.includes(key)
            ){

                groups["Besok"]
                .push(task);

            }

        }


    }




    const channel =
        await client.channels.fetch(
            taskNotifChannel
        );



    let changed = false;



    for(const type in groups){


        const reminderTasks =
            groups[type];



        if(
            reminderTasks.length === 0
        )
            continue;




        const embed =
            new EmbedBuilder()


            .setTitle(
                "🔔 Sekedar Mengingatkan"
            )


            .setDescription(

`${type}

━━━━━━━━━━━━━━
${
reminderTasks.map(task =>

`📌 **${task.title}**

Deskripsi:
${task.description || "-"}

Kode:
${task.id}

`

).join("\n")
}
━━━━━━━━━━━━━━`

            )


            .setColor(
                0x3498db
            );




        await channel.send({

            content:
                `<@&${memberClassRole}>`,

            embeds:[
                embed
            ]

        });




        for(const task of reminderTasks){


            if(type === "Besok"){

                task.reminderSent.push(
                    `1-${hour}`
                );

            }


            if(type === "3 Hari Lagi"){

                task.reminderSent.push(
                    `3-${hour}`
                );

            }


            if(type === "7 Hari Lagi"){

                task.reminderSent.push(
                    "7-10"
                );

            }


            if(type === "14 Hari Lagi"){

                task.reminderSent.push(
                    "14-10"
                );

            }


            changed = true;


        }


    }



    if(changed){

        taskService.saveTasks(
            tasks
        );

    }


}



module.exports = {

    checkReminder

};