const taskService =
    require("../../services/taskService");

const {
    createTaskModal
} = require("../../utils/taskModal");

const hasRole =
    require("../../utils/checkRole");
const {
    taskManagerRole
} = require("../../config/permissions");

module.exports = {

    async execute(interaction) {

        console.log("TUGAS ADD DIPANGGIL");

        const pendingTask =
    taskService.getPendingByUser(
        interaction.user.id
    );

    // Periksa apakah pengguna memiliki peran yang diperlukan
    if (!hasRole(interaction, taskManagerRole)) {
        return interaction.reply({
            content: "❌ Kamu tidak memiliki izin untuk command ini.",
            ephemeral: true
        });
    }

let modalData = {};



if (pendingTask) {


    if (
        pendingTask.expiresAt &&
        Date.now() > pendingTask.expiresAt
    ) {


        taskService.removePendingTask(
            pendingTask.id
        );


    } else {


        modalData = pendingTask;


    }

}

        // Jika tidak ada draft, buka modal kosong
        return interaction.showModal(
            createTaskModal(modalData)
        );

    }

};