const pool =
    require("../database/db");

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const {
    formatDeadline
} = require("../utils/dateUtils");


// =========================
// DATABASE TASK BOARD
// =========================

async function getBoardTask(taskId) {

    const result =
        await pool.query(
            `
            SELECT
                task_id AS "taskId",
                message_id AS "messageId"
            FROM task_board
            WHERE task_id = $1
            `,
            [taskId]
        );

    return result.rows[0] || null;

}


async function saveBoardTask(
    taskId,
    messageId
) {

    await pool.query(
        `
        INSERT INTO task_board (
            task_id,
            message_id
        )
        VALUES ($1, $2)

        ON CONFLICT (task_id)
        DO UPDATE SET
            message_id = EXCLUDED.message_id
        `,
        [
            taskId,
            messageId
        ]
    );

}


async function deleteBoardTask(
    taskId
) {

    await pool.query(
        `
        DELETE FROM task_board
        WHERE task_id = $1
        `,
        [taskId]
    );

}


// =========================
// EMBED TUGAS
// =========================

function createTaskEmbed(task) {

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

function createDetailButton(task) {

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
) {

    const {
        taskListChannel
    } = require("../config/channels");


    const channel =
        await client.channels.fetch(
            taskListChannel
        );


    const message =
        await channel.send({

            embeds: [
                createTaskEmbed(task)
            ],

            components: [
                createDetailButton(task)
            ]

        });


    // Simpan mapping ke Neon

    await saveBoardTask(
        task.id,
        message.id
    );


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
) {

    const {
        taskListChannel
    } = require("../config/channels");


    const channel =
        await client.channels.fetch(
            taskListChannel
        );


    const task =
        await getBoardTask(
            taskId
        );


    if (!task) {

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


    } catch (err) {

        console.log(
            "Pesan Discord tidak ditemukan:",
            taskId
        );

    }


    // Hapus mapping dari Neon

    await deleteBoardTask(
        taskId
    );

}


// =========================
// UPDATE TASK BOARD
// =========================

async function updateTaskBoard(
    client,
    task
) {

    const {
        taskListChannel
    } = require("../config/channels");


    const channel =
        await client.channels.fetch(
            taskListChannel
        );


    const data =
        await getBoardTask(
            task.id
        );


    if (!data) {

        console.log(
            "Pesan task tidak ditemukan untuk update:",
            task.id
        );

        return;

    }


    try {

        const message =
            await channel.messages.fetch(
                data.messageId
            );


        await message.edit({

            embeds: [

                createTaskEmbed(task)

            ],

            components: [

                createDetailButton(task)

            ]

        });


        console.log(
            "Task board diupdate:",
            task.id
        );


    } catch (err) {

        console.error(
            "Gagal update task board:",
            err
        );

    }

}


// =========================
// SYNC TASK BOARD
// =========================

async function syncTaskBoard(
    client
) {

    const taskService =
        require("./taskService");


    const tasks =
        await taskService.getTasks();


    const {
        taskListChannel
    } = require("../config/channels");


    const channel =
        await client.channels.fetch(
            taskListChannel
        );


    for (const task of tasks) {

        const saved =
            await getBoardTask(
                task.id
            );


        // =====================
        // Sudah punya pesan
        // =====================

        if (saved) {

            try {

                const message =
                    await channel.messages.fetch(
                        saved.messageId
                    );


                await message.edit({

                    embeds: [

                        createTaskEmbed(task)

                    ],

                    components: [

                        createDetailButton(task)

                    ]

                });


                console.log(
                    `Update task ${task.id}`
                );


                continue;


            } catch (err) {

                console.log(
                    `Pesan ${task.id} hilang, buat baru`
                );


                // Pesan Discord sudah hilang.
                // Hapus mapping lama dari Neon.

                await deleteBoardTask(
                    task.id
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


// =========================
// EXPORT
// =========================

module.exports = {

    addTaskBoard,

    updateTaskBoard,

    removeTaskBoard,

    createTaskEmbed,

    createDetailButton,

    syncTaskBoard

};