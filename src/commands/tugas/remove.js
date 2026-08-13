const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
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



    const row =
        new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()

            .setCustomId(
                `task-delete-confirm-${id}`
            )

            .setLabel(
                "Hapus"
            )

            .setStyle(
                ButtonStyle.Danger
            ),


            new ButtonBuilder()

            .setCustomId(
                `task-delete-cancel-${id}`
            )

            .setLabel(
                "Batal"
            )

            .setStyle(
                ButtonStyle.Secondary
            )

        );



        await interaction.reply({

            content:
                `⚠️ Yakin ingin menghapus tugas ${id}?`,

            components:[
                row
            ],

            ephemeral:true

        });


}


};