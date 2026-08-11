const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const {
    formatDeadline
} = require("../utils/dateUtils");

const boardPath =
    path.join(
        __dirname,
        "..",
        "data",
        "taskBoard.json"
    );


// =========================
// BOARD DATA
// =========================

function getBoardData(){

    try {

        return JSON.parse(
            fs.readFileSync(
                boardPath,
                "utf8"
            )
        );


    } catch {

        return {
            tasks:{}
        };

    }

}



function saveBoardData(data){

    fs.writeFileSync(
        boardPath,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}



// =========================
// EMBED TUGAS
// =========================

function createTaskEmbed(task){
    return new EmbedBuilder()
        .setTitle(
            `${task.title}`
        )
        .setDescription(
`**Deadline**: ${formatDeadline(task.deadline)} | ${task.time}`
        )
        .setColor(
            0x3498db
        )
        .setFooter({
            text:
                `id: ${task.id}`
        });
}



// =========================
// BUTTON DETAIL
// =========================

function createDetailButton(task){

    return new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()

                .setCustomId(
                    `task-info-${task.id}`
                )

                .setLabel(
                    "Detail"
                )

                .setStyle(
                    ButtonStyle.Primary
                )

        );

}



// =========================
// TAMBAH TASK KE BOARD
// =========================

async function addTaskBoard(
    client,
    task
){

    const {
        taskListChannel
    } = require("../config/channels");


    const channel =
        await client.channels.fetch(
            taskListChannel
        );


    const message =
        await channel.send({

            embeds:[
                createTaskEmbed(task)
            ],

            components:[
                createDetailButton(task)
            ]

        });



    const board =
        getBoardData();



    if(!board.tasks){

        board.tasks = {};

    }



    board.tasks[task.id] = {

        messageId: message.id

    };



    saveBoardData(board);


    console.log(
        `Task board dibuat: ${task.id}`
    );


    return message;

}

// =========================
// HAPUS TASK DARI BOARD
// =========================

async function removeTaskBoard(
    client,
    taskId
){

    const {
        taskListChannel
    } = require("../config/channels");


    const channel =
        await client.channels.fetch(
            taskListChannel
        );


    const board =
        getBoardData();



    const task =
        board.tasks?.[taskId];



    if(!task){

        console.log(
            "Data task board tidak ditemukan:",
            taskId
        );

        return;

    }



    try {


        const message =
            await channel.messages.fetch(
                task.messageId
            );


        await message.delete();


        console.log(
            "Pesan task dihapus:",
            taskId
        );


    } catch(err){

        console.log(
            "Pesan Discord tidak ditemukan:",
            taskId
        );

    }



    delete board.tasks[taskId];


    saveBoardData(board);

}

async function updateTaskBoard(
    client,
    task
){

    const {
        taskListChannel
    } = require("../config/channels");


    const channel =
        await client.channels.fetch(
            taskListChannel
        );


    const board =
        getBoardData();


    const data =
        board.tasks[task.id];


    if(!data){

        console.log(
            "Pesan task tidak ditemukan untuk update"
        );

        return;

    }



    try{


        const message =
            await channel.messages.fetch(
                data.messageId
            );


        await message.edit({

            embeds:[

                createTaskEmbed(task)

            ],

            components:[

                createDetailButton(task)

            ]

        });



        console.log(
            "Task board diupdate:",
            task.id
        );


    }catch(err){


        console.error(
            "Gagal update task board:",
            err
        );


    }

}

async function syncTaskBoard(client){

    const taskService =
        require("./taskService");


    const tasks =
        taskService.getTasks();


    const board =
        getBoardData();


    const {
        taskListChannel
    } = require("../config/channels");


    const channel =
        await client.channels.fetch(
            taskListChannel
        );



    for(const task of tasks){

    const saved =
        board.tasks?.[task.id];



        // =====================
        // Sudah punya pesan
        // =====================

        if(saved){


            try {


                const message =
                    await channel.messages.fetch(
                        saved.messageId
                    );


                await message.edit({

                    embeds:[
                        createTaskEmbed(task)
                    ],

                    components:[
                        createDetailButton(task)
                    ]

                });


                console.log(
                    `Update task ${task.id}`
                );


                continue;


            } catch(err){

                console.log(
                    `Pesan ${task.id} hilang, buat baru`
                );

            }


        }



        // =====================
        // Buat pesan baru
        // =====================

        await addTaskBoard(
            client,
            task
        );


    }

}

module.exports = {

    addTaskBoard,

    updateTaskBoard,

    removeTaskBoard,

    createTaskEmbed,

    createDetailButton,

    syncTaskBoard

};