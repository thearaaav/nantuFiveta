require("dotenv").config();

console.log({
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID
});

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];

const commandsPath = path.join(__dirname, "src", "commands");

function readCommands(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);

        if (fs.statSync(filePath).isDirectory()) {
            readCommands(filePath);
        } else if (file.endsWith(".js")) {
            const command = require(filePath);

            if ("data" in command) {
                commands.push(command.data.toJSON());
            }
        }
    }
}

readCommands(commandsPath);

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Deploying ${commands.length} command(s)...`);

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✅ Slash Commands berhasil di-deploy.");
    } catch (err) {
        console.error(err);
    }
})();