const taskService =
require("./src/services/taskService");


const data = {

    id: Date.now(),

    userId: "123",

    title: "Tes Pending",

    subject: "Pemrograman",

    deadline: "30/07",

    time: "23:59",

    description: "-"

};


taskService.addPendingTask(data);


console.log(
    taskService.getPendingTasks()
);