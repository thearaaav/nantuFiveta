const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");



module.exports = {


    async execute(interaction){


        const taskId =
            interaction.customId.split("-")[3];



        const row =
            new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId(
                        `task-delete-yes-${taskId}`
                    )

                    .setLabel(
                        "Hapus"
                    )

                    .setStyle(
                        ButtonStyle.Danger
                    ),


                new ButtonBuilder()

                    .setCustomId(
                        `task-delete-cancel-${taskId}`
                    )

                    .setLabel(
                        "Batal"
                    )

                    .setStyle(
                        ButtonStyle.Secondary
                    )

            );



        await interaction.update({

            content:
                `⚠️ Yakin ingin menghapus tugas ${taskId}?`,
            components:[
                row
            ],

        });


    }


};