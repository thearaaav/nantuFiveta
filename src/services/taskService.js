const fs = require("fs");
const path = require("path");


const tasksPath =
    path.join(
        __dirname,
        "..",
        "data",
        "tasks.json"
    );


const pendingPath =
    path.join(
        __dirname,
        "..",
        "data",
        "pendingTasks.json"
    );


function readJSON(file){

    try{

        return JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );

    }catch{

        return [];

    }

}



function saveJSON(file,data){

    fs.writeFileSync(
        file,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}



// =================
// TASKS
// =================

function getTasks(){

    return readJSON(tasksPath);

}

function saveTasks(tasks){

    saveJSON(
        tasksPath,
        tasks
    );

}

function addTask(task){

    const tasks =
        getTasks();

    tasks.push(task);

    saveJSON(
        tasksPath,
        tasks
    );

    return task;

}

function generateTaskId(){

    const tasks = getTasks();


    if(tasks.length === 0){

        return "001";

    }


    const lastId =
        Math.max(
            ...tasks.map(
                task => Number(task.id)
            )
        );


    return String(
        lastId + 1
    ).padStart(
        3,
        "0"
    );

}



function getTaskById(id){

    const tasks =
        getTasks();


    return tasks.find(
        task => task.id === id
    );

}



function updateTask(id, data){

    const tasks =
        getTasks();


    const index =
        tasks.findIndex(
            task => task.id === id
        );


    if(index === -1){

        return null;

    }


    const oldTask =
        tasks[index];



    // =========================
    // Reset reminder jika deadline berubah
    // =========================

    if(
        data.deadline &&
        (
            data.deadline !== oldTask.deadline ||
            data.time !== oldTask.time
        )
    ){

        data.reminderSent = [];

    }



    tasks[index] = {

        ...oldTask,

        ...data

    };



    saveJSON(
        tasksPath,
        tasks
    );


    return tasks[index];

}



function deleteTask(id){

    const tasks =
        getTasks();


    const filtered =
        tasks.filter(
            task => task.id !== id
        );


    saveJSON(tasksPath, filtered);


    return true;

}

// =================
// PENDING
// =================

function getPendingTasks(){

    return readJSON(pendingPath);

}


function addPendingTask(task){

    const pending =
        getPendingTasks();

    pending.push(task);

    saveJSON(
        pendingPath,
        pending
    );

}


function updatePendingTask(task){

    const pending =
        getPendingTasks();


    const index =
        pending.findIndex(
            t => t.userId === task.userId
        );


    if(index === -1)
        return null;


    pending[index] = task;


    saveJSON(
        pendingPath,
        pending
    );


    return task;

}



function getPendingByUser(userId){

    const pending =
        getPendingTasks();


    return pending.find(
        t => t.userId === userId
    );

}



function removePendingTask(id){

    const pending =
        getPendingTasks();


    const result =
        pending.filter(
            t => t.id !== id
        );


    saveJSON(
        pendingPath,
        result
    );

}

// function generateTaskId(){

//     const tasks =
//         getTasks();


//     if(tasks.length === 0){

//         return "001";

//     }


//     const lastTask =
//         tasks[tasks.length - 1];


//     const lastId =
//         Number(lastTask.id);


//     return String(lastId + 1)
//         .padStart(3, "0");

// }

function removePendingByUser(userId){

    const pending =
        getPendingTasks();


    const updated =
        pending.filter(
            task => task.userId !== userId
        );


    saveJSON(
        pendingPath,
        updated
    );

}

function hasPendingTask(userId){

    const pending =
        getPendingTasks();


    return pending.some(
        task => task.userId === userId
    );

}


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

    deleteTask,

};