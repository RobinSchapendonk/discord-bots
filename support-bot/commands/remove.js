// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if (message.channel.name.includes('-ticket')) {
		client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
			const reason = args.slice(1).join(' ') || 'No reason provided';

			await message.channel.createOverwrite(member.id, { 'VIEW_CHANNEL': false, 'SEND_MESSAGES': false, 'READ_MESSAGE_HISTORY': false });

			message.channel.send(`${message.member.displayName} remove ${member.displayName} from this ticket because ${reason}!`);
		}).catch(invalidMemberError => {
			return message.channel.send(invalidMemberError);
		});
	} else {
		embed.setTitle('This is not a ticket!');
		return message.channel.send(embed);
	}
};


exports.help = {
	name: 'remove',
	category: 'Tickets',
	description: 'Remove someone from a ticket',
	usage: 'remove <GuildMember> [Reason=No reason provided]',
};