const path = require('path');
const userModel = require(path.join(__dirname, '../models/users.js'));
const guildModel = require(path.join(__dirname, '../models/guilds.js'));
const { owners } = require(path.join(__dirname, '../config.json'));

module.exports.run = async (client, message, args, prefix) => {
    if (!owners.includes(message.member.id)) return;

    const type = args[0];
    if (!type) return message.channel.send('You need to specify the type (`user` or `guild`)');

    if (type == 'user') {
        const userID = args[1];
        if (!userID) return message.channel.send('You need to specify the userID to blacklist!');
        if (owners.includes(userID)) return message.channel.send('You can\'t blacklist an owner!');

        const document = await userModel.findById(userID) || new userModel({ _id: userID });
        document.blacklisted = true;

        client.blacklist.set(`u.${userID}`, true);

        document.save().then(() => {
            return message.channel.send('Blacklisted them!');
        }).catch(err => {
            console.log('commands/blacklist.js\n', err);
            return message.channel.send('Error when saving document!');
        });
    } else if (type == 'guild') {
        const guildID = args[1];
        if (!guildID) return message.channel.send('You need to specify the guildID to blacklist!');

        const guild = await client.guilds.fetch(guildID);
        if (guild) await guild.leave();

        const document = await guildModel.findById(guildID) || new guildModel({ _id: guildID });
        document.blacklisted = true;

        client.blacklist.set(`g.${guildID}`, true);

        document.save().then(() => {
            return message.channel.send('Blacklisted that guild!');
        }).catch(err => {
            console.log('commands/blacklist.js\n', err);
            return message.channel.send('Error when saving document!');
        });
    } else {
        return message.channel.send('You need to specify the type (`user` or `guild`)');
    }
};


exports.help = {
    name: 'blacklist',
    category: 'Owner',
    description: 'Blacklist a user',
    usage: 'blacklist <userID>',
};