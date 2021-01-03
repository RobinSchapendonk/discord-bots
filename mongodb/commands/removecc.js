const path = require('path');
const CCModel = require(path.join(__dirname, '../models/customcommands.js'));

module.exports.run = async (client, message, args, prefix) => {
    if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send('You have no permissions to do that');
    
    const name = args[0];
    if (!name) return message.channel.send('You need to specify the name!');
    if (!client.customcommands.get(`${message.guild.id}.${name}`)) return message.channel.send('That\'s not a custom command!');

    const CCDocument = await CCModel.deleteOne({ guild: message.guild.id, name: name });
    if (CCDocument.deletedCount == 0) return message.channel.send('That\'s not a custom command!');
    else {
        client.customcommands.delete(`${message.guild.id}.${name}`)
        return message.channel.send('Deleted the custom command!');
    }
};


exports.help = {
    name: 'removecc',
    category: 'Custom Commands',
    description: 'Remove a custom command',
    usage: 'removecc <name>',
};