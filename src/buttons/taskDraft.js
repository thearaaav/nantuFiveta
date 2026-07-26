const {
    createTaskModal
} = require("../utils/taskModal");

const taskService =
    require("../services/taskService");


async function submitDraft(interaction) {

    console.log("Submit Draft");

    // Akan kita isi pada Sprint berikutnya

}


async function editDraft(interaction) {

    console.log("Edit Draft");


    const pendingTask =
        taskService.getPendingByUser(
            interaction.user.id
        );


    if (!pendingTask) {

        return interaction.reply({

            content: "❌ Draft tidak ditemukan.",

            ephemeral: true

        });

    }


    await interaction.showModal(

        createTaskModal(pendingTask)

    );

}


async function newDraft(interaction) {

    console.log("Buat Baru");


    taskService.removePendingByUser(
        interaction.user.id
    );


    await interaction.showModal(
        createTaskModal()
    );

}


module.exports = {

    ids: [

        "task-draft-submit",

        "task-draft-edit",

        "task-draft-new"

    ],


    async execute(interaction) {

        switch (interaction.customId) {

            case "task-draft-submit":

                return submitDraft(interaction);


            case "task-draft-edit":

                return editDraft(interaction);


            case "task-draft-new":

                return newDraft(interaction);

        }

    }

};