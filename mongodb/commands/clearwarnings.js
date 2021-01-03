const path = require('path');
const warnModel = require(path.join(__dirname, '../models/warnings.js'));

module.exports.run = async (client, message, args, prefix) => {
    if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send('You have no permissions to do that');
    client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
        if (member.id == message.member.id) return message.channel.send('You can\'t clear warnings of yourself!');

        const positionDifference = message.member.roles.highest.comparePositionTo(member.roles.highest);
        if (positionDifference <= 0) return message.channel.send('You can\'t clear warnings of members with equal or higher position!');

        warnModel.deleteMany({ user: member.id }).then(() => {
            return message.channel.send(`Deleted all warnings from ${member.displayName}`);
        }).catch(err => {
            console.log('commands/clearwarnings.js\n', err);
            return message.channel.send('Error when deleting document!');
        });
    }).catch(invalidMemberError => {
        return message.channel.send(invalidMemberError);
    });
};


exports.help = {
    name: 'clearwarnings',
    category: 'Moderation',
    description: 'Clear the warnings of a member',
    usage: 'clearwarnings <GuildMember>',
};