const {
    createTaskModal
} = require("../../utils/taskModal");
const taskService =
    require("../../services/taskService");
const hasRole =
    require("../../utils/checkRole");
const {
    taskManagerRole
} = require("../../config/permissions");

module.exports = {


async execute(interaction){


    const id =
        interaction.options.getString("id");


    const task =
        await taskService.getTaskById(id);


    // Periksa apakah pengguna memiliki peran yang diperlukan
    if (!hasRole(interaction, taskManagerRole)) {
        return interaction.reply({
            content: "❌ Kamu tidak memiliki izin untuk command ini.",
            ephemeral: true
        });
    }

    if(!task){

        return interaction.reply({

            content:
                "❌ Tugas tidak ditemukan.",

            ephemeral:true

        });

    }


    const modal =
        createTaskModal(
            task,
            "edit"
        );


    await interaction.showModal(
        modal
    );


}


};