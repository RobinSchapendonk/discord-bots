const { v4: uuidv4 } = require('uuid');
const path = require('path');
const CCModel = require(path.join(__dirname, '../models/customcommands.js'));

module.exports.run = async (client, message, args, prefix) => {
    if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send('You have no permissions to do that');
    
    const name = args[0];
    const response = args.slice(1).join(' ');

    if (!name) return message.channel.send('You need to specify the name!');
    if (!response) return message.channel.send('You need to specify the resonse!');

    if (name.length > 100) return message.channel.send('The name can\'t be long than 100 characters!');
    if (response.length > 2000) return message.channel.send('The response can\'t be long than 2000 characters!');

    if (client.commands.get(name + '.js')) return message.channel.send('You can\'t use an already existing command!');
    if (client.customcommands.get(`${message.guild.id}.${name}`)) return message.channel.send('You can\'t use an already existing name!');

    const uuid = uuidv4();

    const CCDocument = new CCModel({
        _id: uuid,
        guild: message.guild.id,
        name,
        response,
    });

    CCDocument.save().then(() => {
        client.customcommands.set(`${message.guild.id}.${name}`, response);
        return message.channel.send(`Added the command \`${name}\`!`);
    }).catch(err => {
        console.log('commands/addcc.js\n', err);
        return message.channel.send('Error when saving document!');
    })
};


exports.help = {
    name: 'addcc',
    category: 'Custom Commands',
    description: 'Add a custom command',
    usage: 'addcc <name> <response>',
};