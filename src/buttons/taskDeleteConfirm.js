const taskService =
    require("../services/taskService");


const taskBoardService =
    require("../services/taskBoardService");



module.exports = {

async execute(interaction){


    const id =
        interaction.customId.split("-")[3];



    // cek apakah tugas masih ada

    const task =
        await taskService.getTaskById(id);



    if(!task){

        return interaction.update({

            content:
                "❌ Tugas sudah tidak ada.",

            components:[]

        });

    }



    await taskService.deleteTask(id);



    await taskBoardService.removeTaskBoard(

        interaction.client,

        id

    );



    await interaction.update({

        content:
            `✅ Tugas ${id} berhasil dihapus.`,

        components:[]

    });



}

};