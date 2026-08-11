const {
    EmbedBuilder
} = require("discord.js");


const {
    taskNotifChannel
} = require("../config/channels");


const {
    memberClassRole
} = require("../config/roles");



async function sendNewTaskNotification(
    client,
    task
){


    const channel =
        await client.channels.fetch(
            taskNotifChannel
        );



    if(!channel)
        return;



    const embed =
        new EmbedBuilder()

        .setTitle(
            `${task.title}`
        )

        .setDescription(

`
**Mata Kuliah**: ${task.subject}
**Deadline**: ${task.deadline} | ${task.time}
`
        )
        .setColor(
            0x2ecc71
        )
        .setFooter({
            text:
                `id: ${task.id}`
        });
    await channel.send({

        content:
            `🔔 <@&${memberClassRole}>! Ada tugas baru.`,

        embeds:[
            embed
        ]

    });


}



module.exports = {

    sendNewTaskNotification

};