const path = require('path');
const warnModel = require(path.join(__dirname, '../models/warnings.js'));

module.exports.run = async (client, message, args, prefix) => {
    if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send('You have no permissions to do that');
    
    const caseID = args[0];
    if (!caseID) return message.channel.send('You need to specify the caseID!');
    
    warnModel.findByIdAndDelete(caseID).then(async document => {
        if (!document) return message.channel.send('That is an invalid caseID!');
        if (document.user == message.member.id) {
            const warningDocument = new warnModel({
                _id: document._id,
                moderator: document.moderator,
                reason: document.reason,
                user: document.user,
                time: document.time
            });
            await warningDocument.save();
            return message.channel.send('You can\'t delete warnings from yourself!');
        } else {
            const user = await client.users.fetch(document.user) || null;
            return message.channel.send(`Sucessfully deleted the warning from ${user.tag}!`);
        }
    }).catch(err => {
        console.log('commands/deletewarning.js\n', err);
        return message.channel.send('Error when deleting document!');
    });
};


exports.help = {
    name: 'deletewarning',
    category: 'Moderation',
    description: 'Delete a warning',
    usage: 'deletewarning <caseID>',
};