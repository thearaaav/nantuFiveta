const {
    SlashCommandBuilder
} = require("discord.js");


module.exports = {


    data: new SlashCommandBuilder()

        .setName("tugas")

        .setDescription("Manajemen tugas")


        // =================
        // ADD
        // =================

        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("Tambah tugas")
        )


        // =================
        // EDIT
        // =================

        .addSubcommand(sub =>
            sub

                .setName("edit")

                .setDescription("Edit tugas")

                .addStringOption(option =>

                    option

                    .setName("id")

                    .setDescription("ID tugas")

                    .setRequired(true)

                )

        )


        // =================
        // DELETE
        // =================

        .addSubcommand(sub =>
            sub

                .setName("delete")

                .setDescription("Hapus tugas")

                .addStringOption(option =>

                    option

                    .setName("id")

                    .setDescription("ID tugas")

                    .setRequired(true)

                )

        ),



    async execute(interaction) {


        const subcommand =
            interaction.options.getSubcommand();



        switch(subcommand){


            case "add":

                return require("./add")
                    .execute(interaction);



            case "edit":

                return require("./edit")
                    .execute(interaction);



            case "delete":

                return require("./remove")
                    .execute(interaction);


        }


    }


};