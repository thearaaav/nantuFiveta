const taskService =
    require("../services/taskService");


module.exports = {


    ids: [

        "task-confirm",
        "task-edit",
        "task-cancel"

    ],



    async execute(interaction) {


        console.log(
            "MASUK TASK CONFIRM:",
            interaction.customId
        );



        // =========================
        // Ambil tipe tombol + ID draft
        // =========================

        const parts =
            interaction.customId.split("-");


        const action =
            parts[1];


        const confirmationId =
            parts[2];



        const draft =
            taskService.getPendingByUser(
                interaction.user.id
            );
        if(!draft){

    return interaction.update({

        content:
            "❌ Konfirmasi sudah kadaluarsa.",

        embeds: [],

        components: []

    });

}



        // =========================
        // Draft tidak ditemukan
        // =========================

        if (!draft) {


            return interaction.update({
                content:
                    "❌ Konfirmasi sudah kadaluarsa.",

                embeds: [],
                components: []
            });


        }



        // =========================
        // Tombol lama
        // =========================

        if (
    draft.id !== confirmationId
) {


    return interaction.update({

        content:
            "❌ Konfirmasi sudah kadaluarsa.",

        embeds: [],

        components: []

    });


}

// =========================
// Lewat 15 menit
// =========================

if (
    draft.expiresAt &&
    Date.now() > draft.expiresAt
) {


    taskService.removePendingTask(
        draft.id
    );


    return interaction.update({

        content:
            "❌ Konfirmasi sudah kadaluarsa.",

        embeds: [],

        components: []

    });


}





        // =========================
        // SUBMIT
        // =========================

if (action === "confirm") {


    const newTask = {

    id: draft.id,

    userId: draft.userId,

    title: draft.title,

    subject: draft.subject,

    deadline: draft.deadline,

    time: draft.time,

    description: draft.description,

    createdAt: draft.createdAt,

    reminderSent: []

};


taskService.addTask(
    newTask
);

    taskService.removePendingTask(
        draft.id
    );

    const {
    sendNewTaskNotification
} =
require("../services/taskNotificationService");


try {

    await sendNewTaskNotification(
        interaction.client,
        newTask
    );


} catch(err){

    console.error(
        "Gagal kirim notif tugas baru:",
        err
    );

}

await interaction.update({

    content:
        "✅ Tugas berhasil ditambahkan.",
    embeds: [],

    components: []

});




const taskBoardService =
    require("../services/taskBoardService");


try {

    await taskBoardService.addTaskBoard(
        interaction.client,
        draft
    );


} catch(err) {

    console.error(
        "Gagal tambah task board:",
        err
    );

}

    return;

}

        // =========================
        // BATAL
        // =========================

        if (
            action === "cancel"
        ) {


            taskService.removePendingTask(
                draft.id
            );


            await interaction.update({

                content:
                    "❌ Menambahkan tugas dibatalkan.",

                embeds: [],

                components: []

            });


            return;

        }





        // =========================
// EDIT
// =========================

if (
    action === "edit"
) {


    const {
        createTaskModal
    } = require("../utils/taskModal");



    await interaction.showModal(
        createTaskModal(draft)
    );


    return;

}


    }

};