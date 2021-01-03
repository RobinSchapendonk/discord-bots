const { v4: uuidv4 } = require('uuid');
const path = require('path');
const warnModel = require(path.join(__dirname, '../models/warnings.js'));

module.exports.run = async (client, message, args, prefix) => {
    if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send('You have no permissions to do that');
    client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
        if (member.id == message.member.id) return message.channel.send('You can\'t warn yourself!');

        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (reason.length > 512) return message.channel.send(`The reason can't be longer than 512 characters! (You have ${reason.length - 512} characters too much)`);

        const positionDifference = message.member.roles.highest.comparePositionTo(member.roles.highest);
        if (positionDifference <= 0) return message.channel.send('You can\'t warn members with equal or higher position!');

        const uuid = uuidv4();

        const warningDocument = new warnModel({
            _id: uuid,
            moderator: message.member.id,
            reason: reason,
            user: member.id,
            time: message.createdAt
        });

        warningDocument.save().then(() => {
            message.channel.send(`Warned ${member.displayName} for ${reason}!`);
            return member.send(`You're warned for ${reason}, don't let it happen again!`).catch(() => { return undefined });
        }).catch(err => {
            console.log('commands/warn.js\n', err);
            return message.channel.send('Error when saving document!');
        })
    }).catch(invalidMemberError => {
        return message.channel.send(invalidMemberError);
    });
};


exports.help = {
    name: 'warn',
    category: 'Moderation',
    description: 'Warn a member',
    usage: 'warn <GuildMember> [Reason=No reason provided]',
};