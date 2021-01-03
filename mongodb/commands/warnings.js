const path = require('path');
const warnModel = require(path.join(__dirname, '../models/warnings.js'));
const { MessageEmbed } = require('discord.js');

module.exports.run = async (client, message, args, prefix) => {
    if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send('You have no permissions to do that');
    client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
        const page = parseInt(args[1]) || 1
        let warnings = await warnModel.find({ user: member.id }).limit(10).skip((page - 1) * 10);
        if(warnings.length == 0) return message.channel.send('This page is empty!');

        const embed = new MessageEmbed();
        embed.setTitle(`Warnings for ${member.displayName}`);

        warnings.map(warning => {
			let date = new Date(warning.time);
			const offset = date.getTimezoneOffset();
			date = new Date(date.getTime() + (offset * 60 * 1000)).toISOString().split('T')[0];
			embed.addField(`Warning at ${date} (caseID=\`${warning._id}\`)`, warning.reason);
        });
        return message.channel.send(embed);
    }).catch(invalidMemberError => {
        return message.channel.send(invalidMemberError);
    });
};


exports.help = {
    name: 'warnings',
    category: 'Moderation',
    description: 'Check warnings of a member',
    usage: 'warnings <GuildMember>',
};