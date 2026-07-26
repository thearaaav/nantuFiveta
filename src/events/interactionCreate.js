const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");


module.exports = {

    name: "interactionCreate",


    async execute(interaction, client) {


        // =========================
        // Handler Slash Command
        // =========================

        if (interaction.isChatInputCommand()) {


            const command =
                client.commands.get(
                    interaction.commandName
                );


            if (!command) return;


            try {


                await command.execute(interaction);


            } catch (err) {


                console.error(
                    "ERROR SLASH COMMAND:",
                    err
                );


                if (interaction.replied || interaction.deferred) {


                    await interaction.followUp({

                        content: "Terjadi kesalahan.",

                        ephemeral: true

                    });


                } else {


                    await interaction.reply({

                        content: "Terjadi kesalahan.",

                        ephemeral: true

                    });


                }


            }


            return;

        }





        // =========================
        // Handler Modal Submit
        // =========================

        if (interaction.isModalSubmit()) {


            if (interaction.customId === "task-add-modal") {
                await interaction.deferReply({
                    ephemeral: true
                });

                try {


                    console.log(
                        "MODAL DITERIMA"
                    );



                    const title =
                        interaction.fields.getTextInputValue(
                            "title"
                        );



                    const subject =
                        interaction.fields.getTextInputValue(
                            "subject"
                        );



                    const deadline =
                        interaction.fields.getTextInputValue(
                            "deadline"
                        );

                    let time =
                        interaction.fields.getTextInputValue(
                            "time"
                        );



                    const description =
                        interaction.fields.getTextInputValue(
                            "description"
                        ) || "-";



                    if (!time) {

                        time = "23:59";

                    }



                    console.log(
                        "DATA MODAL:",
                        {
                            title,
                            subject,
                            deadline,
                            time,
                            description
                        }
                    );

const {
    parseDeadline
} = require("../utils/dateUtils");


const parsedDeadline =
    parseDeadline(
        deadline,
        time
    );


if(!parsedDeadline){

    return interaction.editReply({

        content:
        "❌ Format deadline salah.\nGunakan DD/MM (contoh: 28/08)"

    });

}



if(
    parsedDeadline < new Date()
){

    return interaction.editReply({

        content:
        "❌ Deadline tidak boleh tanggal yang sudah lewat."

    });

}

// =========================
// Simpan / Update Draft
// =========================

const taskService =
    require("../services/taskService");


const oldDraft =
    taskService.getPendingByUser(
        interaction.user.id
    );


const pendingTask = {

    id: oldDraft
    ? oldDraft.id
    : taskService.generateTaskId(),

    userId:
        interaction.user.id,

    title,

    subject,

    deadline,

    time,

    description,

    status:
        "pending",

    createdAt:
        oldDraft
            ? oldDraft.createdAt
            : new Date().toISOString(),

    expiresAt:
        Date.now() + (15 * 60 * 1000)

};



if (oldDraft) {

    taskService.updatePendingTask(
        pendingTask
    );

} else {

    taskService.addPendingTask(
        pendingTask
    );

}



// =========================
// Buat Embed
// =========================

const embed =
    new EmbedBuilder()

        .setTitle(
            "Konfirmasi Tugas"
        )

        .setDescription(
`Apakah tugas ini sudah benar?

📝 **Judul**
${title}

📚 **Mata Kuliah**
${subject}

📅 **Deadline**
${deadline}

⏰ **Waktu**
${time}

📄 **Deskripsi**
${description}`
        );




// =========================
// Tombol
// =========================

const submitButton =
    new ButtonBuilder()

        .setCustomId(
            `task-confirm-${pendingTask.id}`
        )

        .setLabel(
            "Submit"
        )

        .setStyle(
            ButtonStyle.Success
        );


const editButton =
    new ButtonBuilder()

        .setCustomId(
            `task-edit-${pendingTask.id}`
        )

        .setLabel(
            "Edit"
        )

        .setStyle(
            ButtonStyle.Primary
        );


const cancelButton =
    new ButtonBuilder()

        .setCustomId(
            `task-cancel-${pendingTask.id}`
        )

        .setLabel(
            "Batal"
        )

        .setStyle(
            ButtonStyle.Danger
        );


const row =
    new ActionRowBuilder()

        .addComponents(
            submitButton,
            editButton,
            cancelButton
        );

                    // Reply konfirmasi dulu

                    await interaction.editReply({

                        embeds: [
                            embed
                        ],

                        components: [
                            row
                        ],

                    });



                    console.log(
                        "KONFIRMASI TERKIRIM"
                    );
                    
                    return;
                    
                } catch (err) {


    console.error(
        "ERROR MODAL:",
        err
    );


    if (interaction.deferred) {

        await interaction.editReply({

            content:
                "❌ Terjadi kesalahan saat membaca form."

        });


    } else {

        await interaction.reply({

            content:
                "❌ Terjadi kesalahan saat membaca form.",

            ephemeral:true

        });

    }


}


            }

    // =========================
    // EDIT TASK
    // =========================

    if (
        interaction.customId.startsWith(
            "task-edit-modal-"
        )
    ) {


        await interaction.deferReply({
            ephemeral:true
        });



        try {


            const taskId =
                interaction.customId.split("-")[3];



            const title =
                interaction.fields.getTextInputValue(
                    "title"
                );


            const subject =
                interaction.fields.getTextInputValue(
                    "subject"
                );


            const deadline =
            interaction.fields.getTextInputValue(
                "deadline"
            );


            let time =
                interaction.fields.getTextInputValue(
                    "time"
                );


            console.log(
                "DEBUG DEADLINE:",
                deadline
            );

            console.log(
                "DEBUG TIME:",
                time
            );


            const description =
                interaction.fields.getTextInputValue(
                    "description"
                ) || "-";



            if(!time){

                time = "23:59";

            }

const {
    parseDeadline
} = require("../utils/dateUtils");


const parsedDeadline =
    parseDeadline(
        deadline,
        time
    );


if(!parsedDeadline){

    return interaction.editReply({

        content:
        "❌ Format deadline salah.\nGunakan DD/MM (contoh: 28/08)"

    });

}

            const taskService =
                require("../services/taskService");



            const updatedTask =
                taskService.updateTask(

                    taskId,

                    {
                        title,
                        subject,
                        deadline,
                        time,
                        description
                    }

                );


            if(!updatedTask){

                return interaction.editReply({

                    content:
                        "❌ Tugas tidak ditemukan."

                });

            }



            const taskBoardService =
                require("../services/taskBoardService");


            console.log(
                "UPDATED TASK:",
                updatedTask
            );


            await taskBoardService.updateTaskBoard(

                interaction.client,

                updatedTask

            );



            await interaction.editReply({

                content:
                    `✅ Tugas ${taskId} berhasil diedit.`

            });

                console.log(
            "CUSTOM ID:",
            interaction.customId
        );
        
        }catch(err){


            console.error(
                "ERROR EDIT MODAL:",
                err
            );


            await interaction.editReply({

                content:
                    "❌ Gagal mengedit tugas."

            });

        }


        return;

    }

            return;

        }
// =========================
// Handler Button
// =========================

if (interaction.isButton()) {
        console.log(
            "BUTTON ID:",
            interaction.customId
        );
    const taskConfirm =
        require("../buttons/taskConfirm");
    const taskDraft =
        require("../buttons/taskDraft");
    const taskInfo =
    require("../buttons/taskInfo");
    if (
        interaction.customId.startsWith("task-confirm-") ||
        interaction.customId.startsWith("task-cancel-") ||
    (
        interaction.customId.startsWith("task-edit-") &&
        !interaction.customId.startsWith("task-edit-info-")
    )
) {
    await taskConfirm.execute(interaction);
    return;
}

if(
interaction.customId.startsWith(
"task-edit-info-"
)
){

    const taskEditInfo =
        require("../buttons/taskEditInfo");


    await taskEditInfo.execute(
        interaction
    );

    return;

}

if(
interaction.customId.startsWith("task-info-")
){
    await taskInfo.execute(interaction);
    return;
}

    if (taskDraft.ids.includes(interaction.customId)) {
        await taskDraft.execute(interaction);
        return;
    }
if(
interaction.customId.startsWith(
"task-delete-yes-"
)
){

    const taskDeleteYes =
        require("../buttons/taskDeleteYes");


    await taskDeleteYes.execute(
        interaction
    );

    return;

}
    if(
    interaction.customId.startsWith(
    "task-delete-cancel-"
    )
    ){

        const taskInfo =
            require("../buttons/taskInfo");


        const taskId =
            interaction.customId.split("-")[3];


        interaction.customId =
            `task-info-${taskId}`;

        await taskInfo.execute(
            interaction,
            true
        );


        return;
    }

if(
interaction.customId.startsWith(
"task-delete-confirm-"
)
){

    const taskDeleteConfirm =
        require("../buttons/taskDeleteConfirm");

    await taskDeleteConfirm.execute(
        interaction
    );
    return;
    }

if(
interaction.customId.startsWith(
"task-delete-info-"
)
){

    const taskDeleteInfo =
        require("../buttons/taskDeleteInfo");


    await taskDeleteInfo.execute(
        interaction
    );

    return;

}
        }
    }
};