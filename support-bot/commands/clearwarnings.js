// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.clearWarnings)) return message.channel.send('You have no permissions to do that');
	client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
		if(member.id == message.member.id) return message.channel.send('You can\'t clearn warnings of yourself!');

		const reason = args.slice(1).join(' ') || 'No reason provided';
		if(reason.length > 512) return message.channel.send(`The reason can't be longer than 512 characters! (You have ${reason.length - 512} characters too much)`);

		const positionDifference = message.member.roles.highest.comparePositionTo(member.roles.highest);

		if(positionDifference <= 0) return message.channel.send('You can\'t clear warnings from members with equal or higher position!');

		const uuid = await client.getUUID(message.channel.id, message.id);

		const punishmentObj = {
			type: 'clearwarn',
			member: member.id,
			moderator: message.member.id,
			reason: reason,
			time: message.createdAt,
			length: 0,
		};

		client.ModCommand(message.guild.id, 'clearwarn', uuid, member.id, message.member.id, reason);

		let otherPunishments = await client.db.punishments.get(`${message.guild.id}/${member.id}`);
		if(!otherPunishments) otherPunishments = [uuid];
		else otherPunishments.push(uuid);
		client.db.punishments.set(`${message.guild.id}/${member.id}`, otherPunishments);

		client.db.punishments.set(`${message.guild.id}/${member.id}/warnings`, []);

		client.db.punishments.set(uuid, punishmentObj);

		return message.channel.send(`Cleared warnings of ${member.displayName} for ${reason}!`);
	}).catch(invalidMemberError => {
		return message.channel.send(invalidMemberError);
	});
};


exports.help = {
	name: 'clearwarnings',
	category: 'Moderation',
	description: 'Clear the warnings a member',
	usage: 'clearwarnings <GuildMember> [Reason=No reason provided]',
};