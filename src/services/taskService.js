const pool = require("../database/db");

const fs = require("fs");
const path = require("path");

const pendingPath =
    path.join(
        __dirname,
        "..",
        "data",
        "pendingTasks.json"
    );


// =========================
// JSON HELPER
// =========================

function readJSON(file) {

    try {

        return JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );

    } catch {

        return [];

    }

}


function saveJSON(file, data) {

    fs.writeFileSync(
        file,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}


// =========================
// TASKS - POSTGRESQL
// =========================

async function getTasks() {

    const result =
        await pool.query(`
            SELECT
                id,
                user_id AS "userId",
                title,
                subject,
                deadline,
                time,
                description,
                created_at AS "createdAt",
                reminder_sent AS "reminderSent"
            FROM tasks
            ORDER BY CAST(id AS INTEGER)
        `);

    return result.rows;

}


async function saveTasks(tasks) {

    for (const task of tasks) {

        await pool.query(
            `
            UPDATE tasks
            SET reminder_sent = $1
            WHERE id = $2
            `,
            [
                JSON.stringify(
                    task.reminderSent || []
                ),
                task.id
            ]
        );

    }

}


async function addTask(task) {

    await pool.query(
        `
        INSERT INTO tasks (
            id,
            user_id,
            title,
            subject,
            deadline,
            time,
            description,
            created_at,
            reminder_sent
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
        )
        `,
        [
            task.id,
            task.userId,
            task.title,
            task.subject || null,
            task.deadline || null,
            task.time || null,
            task.description || null,
            task.createdAt || Date.now(),
            JSON.stringify(
                task.reminderSent || []
            )
        ]
    );

    return task;

}


async function generateTaskId() {

    const result =
        await pool.query(`
            SELECT id
            FROM tasks
            ORDER BY CAST(id AS INTEGER) DESC
            LIMIT 1
        `);

    if (
        result.rows.length === 0
    ) {

        return "001";

    }

    const lastId =
        Number(
            result.rows[0].id
        );

    return String(
        lastId + 1
    ).padStart(
        3,
        "0"
    );

}


async function getTaskById(id) {

    const result =
        await pool.query(
            `
            SELECT
                id,
                user_id AS "userId",
                title,
                subject,
                deadline,
                time,
                description,
                created_at AS "createdAt",
                reminder_sent AS "reminderSent"
            FROM tasks
            WHERE id = $1
            `,
            [id]
        );

    return result.rows[0] || null;

}


async function updateTask(id, data) {

    const oldTask =
        await getTaskById(id);

    if (!oldTask) {

        return null;

    }


    if (
        data.deadline &&
        (
            data.deadline !== oldTask.deadline ||
            data.time !== oldTask.time
        )
    ) {

        data.reminderSent = [];

    }


    const updatedTask = {

        ...oldTask,

        ...data

    };


    await pool.query(
        `
        UPDATE tasks
        SET
            user_id = $1,
            title = $2,
            subject = $3,
            deadline = $4,
            time = $5,
            description = $6,
            created_at = $7,
            reminder_sent = $8
        WHERE id = $9
        `,
        [
            updatedTask.userId,
            updatedTask.title,
            updatedTask.subject || null,
            updatedTask.deadline || null,
            updatedTask.time || null,
            updatedTask.description || null,
            updatedTask.createdAt || Date.now(),
            JSON.stringify(
                updatedTask.reminderSent || []
            ),
            id
        ]
    );


    return updatedTask;

}


async function deleteTask(id) {

    await pool.query(
        `
        DELETE FROM tasks
        WHERE id = $1
        `,
        [id]
    );

    return true;

}


// =========================
// PENDING - JSON
// =========================

function getPendingTasks() {

    return readJSON(
        pendingPath
    );

}


function addPendingTask(task) {

    const pending =
        getPendingTasks();

    pending.push(task);

    saveJSON(
        pendingPath,
        pending
    );

}


function updatePendingTask(task) {

    const pending =
        getPendingTasks();

    const index =
        pending.findIndex(
            t =>
                t.userId ===
                task.userId
        );

    if (index === -1)
        return null;

    pending[index] = task;

    saveJSON(
        pendingPath,
        pending
    );

    return task;

}


function getPendingByUser(userId) {

    const pending =
        getPendingTasks();

    return pending.find(
        t =>
            t.userId === userId
    );

}


function removePendingTask(id) {

    const pending =
        getPendingTasks();

    const result =
        pending.filter(
            t =>
                t.id !== id
        );

    saveJSON(
        pendingPath,
        result
    );

}


function removePendingByUser(userId) {

    const pending =
        getPendingTasks();

    const updated =
        pending.filter(
            task =>
                task.userId !== userId
        );

    saveJSON(
        pendingPath,
        updated
    );

}


function hasPendingTask(userId) {

    const pending =
        getPendingTasks();

    return pending.some(
        task =>
            task.userId === userId
    );

}


// =========================
// EXPORT
// =========================

module.exports = {

    saveJSON,
    readJSON,

    getTasks,
    addTask,
    saveTasks,

    getPendingTasks,
    addPendingTask,
    updatePendingTask,
    getPendingByUser,
    removePendingTask,
    removePendingByUser,
    hasPendingTask,

    generateTaskId,
    getTaskById,
    updateTask,
    deleteTask

};