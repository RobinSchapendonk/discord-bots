const nodeMajorVersion = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajorVersion < 12) {
    console.error('Unsupported NodeJS version! Please install NodeJS 12 or newer.');
    process.exit(1);
}

// Verify node modules have been installed
const fs = require('fs');
const path = require('path');

try {
    fs.accessSync(path.join(__dirname, 'node_modules'));
} catch (e) {
    console.error('Please run "npm i" or run the install.bat before starting the bot!');
    process.exit(1);
}

try {
    fs.accessSync(path.join(__dirname, 'config.json'));
} catch (e) {
    console.error('You need to copy config.example.json to config.json, and fill in the values!');
    process.exit(1);
}

const Discord = require('discord.js');
const db = require('quick.db');
const config = require('./config.json');

if (!config.serverID) {
    console.error('You need to specify your server id!');
    process.exit(1);
}
const prefix = config.prefix || '!';

const client = new Discord.Client();

client.on('ready', () => {
    client.user.setActivity(config.status);
    console.log('Bot has started!');
});

client.on('message', async message => {
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    const embed = new Discord.MessageEmbed()
        .setColor(config.embedColor || 'RANDOM');
    if (message.guild === null && !message.author.bot) {
        let active = await db.fetch(`support_${message.author.id}`);
        let guild = client.guilds.cache.get(config.serverID);
        let channel = null;
        let found = true;
        try {
            if (active) client.channels.cache.get(active.channelID).guild;
        } catch (e) {
            found = false;
        }
        if (!active || !found) {
            active = {};
            channel = await guild.channels.create(message.author.username + "-ModMail", "text", [{
                type: 'role',
                id: guild.id,
                deny: 0x400
            },
            {
                type: 'user',
                id: message.author.id,
                deny: 1024
            }
            ]).catch(console.error);

            if (config.mailCategory) {
                let category = guild.channels.cache.find(c => c.id == config.mailCategory && c.type == "category");
                if (!category) throw new Error("Category channel does not exist");

                await channel.setParent(category.id);
            }

            if (config.supportRole) {
                channel.overwritePermissions([
                    {
                        id: config.supportRole,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                    },
                ]);
            }

            channel.overwritePermissions([
                {
                    id: message.author.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                },
            ]);

            let author = message.author;

            embed
                .setAuthor(`Hello, ${author.tag}`, author.displayAvatarURL)
                .setFooter(config.openMessage || "ModMail ticket created!");
            await author.send(embed).catch(console.error);

            active.channelID = channel.id;
            active.targetID = author.id;
        }

        channel = client.channels.cache.get(active.channelID);
        const avatar = message.author.avatarURL;
        channel.fetchWebhooks().then((webhooks) => {
            const foundHook = webhooks.find((webhook) => webhook.name == 'modmail');
            if (!foundHook) {
                channel.createWebhook('modmail')
                    .then((webhook) => {
                        webhook.send(message.content, {
                            username: message.author.username,
                            avatarURL: avatar,
                        });
                    });
            } else {
                foundHook.send(message.content, {
                    username: message.author.username,
                    avatarURL: avatar,
                });
            };
        });
        message.react(config.emoji || "✅");
        db.set(`support_${message.author.id}`, active);
        return db.set(`supportChannel_${channel.id}`, message.author.id);
    }

    let support = await db.fetch(`supportChannel_${message.channel.id}`);
    if (support && !message.content.startsWith(prefix) && !message.author.bot) {
        support = await db.fetch(`support_${support}`);
        let supportUser = client.users.cache.get(support.targetID);
        if (!supportUser) return message.channel.delete();

        supportUser.send(message.content);

        return message.react(config.emoji || "✅");
    }

    if (command == 'close') {
        if (!message.channel.name.includes('-modmail')) {
            embed.setTitle(config.noMail || 'This is not a modmail ticket!');
            return message.channel.send(embed);
        }
        let userID = db.fetch(`supportChannel_${message.channel.id}`);
        db.delete(`supportChannel_${message.channel.id}`);
        db.delete(`support_${userID}`);
        return message.channel.delete();
    } else if (command == 'help') {
        let description = 'botinfo -> get info about the bot';
        if (message.author.id == message.guild.owner.id) description += '\nclose -> close a ticket';
        embed.setTitle('help');
        embed.setDescription(description);
        message.channel.send(embed);
    } else if (command == 'botinfo') {
        embed.setTitle('**ModMail Information.**');
        embed.setDescription(`**Version:** ${require('./package.json').version}\n **Made By:** </RobinSch>#7994\n **Want to Purchase?** https://shortrsg.cf/discord`);
        message.channel.send(embed);
    }
});

client.login(config.token)