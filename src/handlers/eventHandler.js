const fs = require("fs");
const path = require("path");

module.exports = (client) => {

    const eventsPath = path.join(__dirname, "..", "events");

    const files = fs.readdirSync(eventsPath);

    for (const file of files) {

        if (!file.endsWith(".js")) continue;

        const event = require(path.join(eventsPath, file));

        if (event.once) {

            client.once(event.name, (...args) => event.execute(...args, client));

        } else {

            client.on(event.name, (...args) => event.execute(...args, client));

        }

        console.log(`📌 Event dimuat : ${event.name}`);

    }

};