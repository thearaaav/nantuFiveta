const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");



function createTaskModal(
    data = {},
    mode = "add"
) {


    const modal = new ModalBuilder();


    if(mode === "edit"){

        modal

            .setCustomId(
                `task-edit-modal-${data.id}`
            )

            .setTitle(
                "Edit Tugas"
            );

    }else{

        modal

            .setCustomId(
                "task-add-modal"
            )

            .setTitle(
                "Tambah Tugas"
            );

    }




    const titleInput = new TextInputBuilder()

        .setCustomId("title")

        .setLabel("Judul")
        .setPlaceholder("Nama Tugas")
        .setStyle(TextInputStyle.Short)

        .setRequired(true)

        .setValue(
            data.title || ""
        );



    const subjectInput = new TextInputBuilder()

        .setCustomId("subject")

        .setLabel("Mata Kuliah")
        .setPlaceholder("Nama Mata Kuliah")
        .setStyle(TextInputStyle.Short)

        .setRequired(true)

        .setValue(
            data.subject || ""
        );



    const deadlineInput = new TextInputBuilder()

        .setCustomId("deadline")

        .setLabel("Deadline")
        .setPlaceholder("DD/MM")
        .setStyle(TextInputStyle.Short)

        .setRequired(true)

        .setValue(
            data.deadline || ""
        );



    const timeInput = new TextInputBuilder()

        .setCustomId("time")

        .setLabel("Waktu")
        .setPlaceholder("HH:MM")
        .setStyle(TextInputStyle.Short)

        .setRequired(false)

        .setValue(
            data.time || ""
        );



    const descriptionInput = new TextInputBuilder()

        .setCustomId("description")

        .setLabel("Deskripsi")
        .setPlaceholder("Opsional")
        .setStyle(TextInputStyle.Paragraph)

        .setRequired(false)

        .setValue(
            data.description || ""
        );



    modal.addComponents(

        new ActionRowBuilder()
            .addComponents(titleInput),

        new ActionRowBuilder()
            .addComponents(subjectInput),

        new ActionRowBuilder()
            .addComponents(deadlineInput),

        new ActionRowBuilder()
            .addComponents(timeInput),

        new ActionRowBuilder()
            .addComponents(descriptionInput)

    );



    return modal;

}



module.exports = {

    createTaskModal

};