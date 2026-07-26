require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Collection
} = require("discord.js");


const loadEvents =
    require("./handlers/eventHandler");

const loadCommands =
    require("./handlers/commandHandler");



const client =
    new Client({

        intents: [
            GatewayIntentBits.Guilds
        ]

    });



client.commands =
    new Collection();



loadCommands(client);

loadEvents(client);



// client.once(
//     "ready",
//     async () => {


//         console.log(
//             `🤖 ${client.user.tag} siap!`
//         );
//     }
// );



client.login(
    process.env.TOKEN
);