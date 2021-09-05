const { Client, Intents, MessageEmbed } = require("discord.js");
const { generateVideo } = require("./shitpost.js");
const request = require("request");
const fs = require("fs");
const path = require('path');
const config = require(`./config`);

const tempDir = "./temp";

const client = new Client({ intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS] });

// invite link for orig trolbot
// https://discord.com/api/oauth2/authorize?client_id=882394859179216896&scope=bot&permissions=3263552
client.login(config.token);

if (!fs.existsSync(tempDir))
    fs.mkdirSync(tempDir);
else
    fs.readdir(tempDir, (err, files) =>
    {
        for (const file of files)
        {
            const filepath = path.join(tempDir, file);
            fs.rm(filepath, { recursive: true }, err => { if (err) { throw err; } })
        }
    });

client.once("ready", () =>
{
    console.log("loaded trol bot");
});

client.on("messageCreate", (msg) =>
{
    if (msg.author.bot) return;

    const args = msg.content.split(/ +/);
    const command = args.shift().toLowerCase();

    if (command == config.prefix)
    {
        if (args[0] == "help")
        {
            const embed = new MessageEmbed()
                .setColor("#ffffff")
                .setTitle(config.prefix + " helpy :^)")
                .addFields(
                    { name: "trol", value: "uses attachment (if any)" },
                    { name: "trol <link>", value: "uses image link" },
                    { name: "trol me", value: "uses sender's pfp" },
                    { name: "trol <@mention>", value: "uses mentioned user's pfp" }
                );
            msg.channel.send({ embeds: [embed] });
        }
        else
        {
            var link = args[0];
            var file = null;
            if (msg.attachments.size == 1) file = msg.attachments.first().attachment;
            if (link != null && file == null)
            {
                if (link == "me") file = msg.author.avatarURL({ format: "png" });
                if (msg.mentions.users.size > 0) file = msg.mentions.users.values().next().value.avatarURL({ format: "png" });
                if (file == null) file = link;
            }

            if (file != null)
            {
                const downloadDir = path.join(tempDir, "download");
                if (!fs.existsSync(downloadDir))
                    fs.mkdirSync(downloadDir);

                var tempFilePath = path.join(downloadDir, `dl_${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`);
                request.head(file, (err, res, body) =>
                {
                    if (err) 
                    {
                        console.log(err);
                        return;
                    }
                    request(file).pipe(fs.createWriteStream(tempFilePath)).on('close', () =>
                    {
                        generateVideo(tempFilePath, 5).then(result =>
                            msg.channel.send({ files: [result] }).then(value =>
                                fs.promises.rm(result)
                            )
                        );
                    });
                });
            }
        }
    }
});
