module.exports = {

    name: "clientReady",

    once: true,

    execute(client) {

        console.log(`🤖 ${client.user.username} sudah online!`);

    }

};