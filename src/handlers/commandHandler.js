const fs = require("fs");
const path = require("path");

module.exports = (client) => {

    const commandsPath = path.join(__dirname, "..", "commands");

    function load(dir) {

        const files = fs.readdirSync(dir);

        for (const file of files) {

            const filePath = path.join(dir, file);

            if (fs.statSync(filePath).isDirectory()) {
                load(filePath);
                continue;
            }

            if (!file.endsWith(".js")) continue;

            const command = require(filePath);

            client.commands.set(command.data.name, command);

            console.log(`✅ Command dimuat : ${command.data.name}`);

        }

    }

    load(commandsPath);

};