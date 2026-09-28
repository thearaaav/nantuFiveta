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

const initDatabase =
    require("./database/init");


const client =
    new Client({

        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildVoiceStates
        ]

    });


client.commands =
    new Collection();


loadCommands(client);

loadEvents(client);


// =========================
// DATABASE + BOT
// =========================

async function startBot() {

    try {

        await initDatabase();

        console.log(
            "✅ Database berhasil terhubung."
        );


        await client.login(
            process.env.TOKEN
        );


    } catch (error) {

        console.error(
            "❌ Gagal startup:",
            error
        );

        process.exit(1);

    }

}


startBot();