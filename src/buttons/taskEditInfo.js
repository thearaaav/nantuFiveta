const taskService =
    require("../services/taskService");


const {
    createTaskModal
} = require("../utils/taskModal");



module.exports = {


    async execute(interaction){


        const taskId =
            interaction.customId.split("-")[3];



        const task =
            await taskService.getTaskById(
                taskId
            );



        if(!task){

            return interaction.reply({

                content:
                    "❌ Tugas tidak ditemukan.",

                ephemeral:true

            });

        }



        await interaction.showModal(

            createTaskModal(
                task,
                "edit"
            )

        );


    }


};