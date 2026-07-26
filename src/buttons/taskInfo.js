
const taskService =
require("../services/taskService");

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {


    ids: [
        "task-info"
    ],



    async execute(interaction, isUpdate = false) {


        console.log(
            "MASUK TASK INFO:",
            interaction.customId
        );



        const parts =
            interaction.customId.split("-");


        const taskId =
            parts[2];



        const tasks =
            taskService.getTasks();



        const task =
            tasks.find(
                t => t.id === taskId
            );



        if(!task){

            return interaction.reply({

                content:
                    "⚠️ Tugas tidak ditemukan.",

                ephemeral:true

            });

        }



        // =========================
        // Hitung waktu tersisa
        // =========================


        const {
            parseDeadline,
            formatDeadline
        } = require("../utils/dateUtils");


        const deadline =
            parseDeadline(
                task.deadline,
                task.time
            );


        const now =
            new Date();



        const diff =
            deadline - now;



        let remaining =
            "Sudah lewat";



            if(diff > 0){
                
                
                const days =
                Math.floor(
                    diff /
                    (1000 * 60 * 60 * 24)
                );
                
                
                const hours =
                Math.floor(
                    (
                        diff %
                        (1000 * 60 * 60 * 24)
                    )
                    /
                    (1000 * 60 * 60)
                );
                
                const minutes =
                    Math.floor(
                        (
                            diff %
                            (1000 * 60 * 60)
                        )
                        /
                        (1000 * 60)
                    );
                
                if(days === 0){

                if(hours === 0){

                    remaining =
                        `Kurang dari ${minutes} menit lagi`;

                }else{


                    remaining =
                        `${hours} jam lagi ${minutes} menit lagi`;

                }


            }else if(days === 1){


                remaining =
                    "Besok";


            }else{


                remaining =
                    `${days} hari lagi`;

            }


        }




            const embed = {

    title:
        `📝 ${task.title}`,


    description:
`
━━━━━━━━━━━━━━
**Mata Kuliah**: ${task.subject}
**Deskripsi**:
${task.description || "-"}

**Deadline**: ${formatDeadline(task.deadline)} | ${task.time}
${remaining}
━━━━━━━━━━━━━━`,
    footer:{
        text:
            `id: ${task.id}`
    }
};


let components = [];



const {
    taskManagerRole
} = require("../config/permissions");



if(
    interaction.member.roles.cache.has(
        taskManagerRole
    )
){

    const editButton =
        new ButtonBuilder()

            .setCustomId(
                `task-edit-info-${task.id}`
            )

            .setLabel(
                "Edit"
            )

            .setStyle(
                ButtonStyle.Primary
            );


    const deleteButton =
        new ButtonBuilder()

            .setCustomId(
                `task-delete-info-${task.id}`
            )

            .setLabel(
                "Hapus"
            )

            .setStyle(
                ButtonStyle.Danger
            );


    components.push(

        new ActionRowBuilder()
            .addComponents(
                editButton,
                deleteButton
            )

    );

}

        if(isUpdate){

            await interaction.update({

                content: '',
                embeds:[
                    embed
                ],

                components

            });


        }else{

            await interaction.reply({

                embeds:[
                    embed
                ],

                components,

                ephemeral:true

            });

}


    }


};