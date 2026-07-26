const taskService =
    require("../services/taskService");


const taskBoardService =
    require("../services/taskBoardService");



module.exports = {


    async execute(interaction){


        const taskId =
            interaction.customId.split("-")[3];



        const task =
            taskService.getTaskById(
                taskId
            );



        if(!task){

            return interaction.reply({

                content:
                    "❌ Tugas tidak ditemukan.",

                ephemeral:true

            });

        }



        // hapus dari tasks.json

        taskService.deleteTask(
            taskId
        );



        // hapus dari task board

        try{

            await taskBoardService.removeTaskBoard(

                interaction.client,

                taskId

            );


        }catch(err){

            console.error(
                "Gagal hapus task board:",
                err
            );

        }



        await interaction.update({

            content:
                `✅ Tugas ${taskId} berhasil dihapus.`,

            components:[]

        });


    }


};