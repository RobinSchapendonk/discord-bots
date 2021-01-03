// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.warn)) return message.channel.send('You have no permissions to do that');
	client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
		if(member.id == message.member.id) return message.channel.send('You can\'t warn yourself!');

		const reason = args.slice(1).join(' ') || 'No reason provided';
		if(reason.length > 512) return message.channel.send(`The reason can't be longer than 512 characters! (You have ${reason.length - 512} characters too much)`);

		const positionDifference = message.member.roles.highest.comparePositionTo(member.roles.highest);
		if(positionDifference <= 0) return message.channel.send('You can\'t warn members with equal or higher position!');

		const uuid = await client.getUUID(message.channel.id, message.id);

		const punishmentObj = {
			type: 'warn',
			member: member.id,
			moderator: message.member.id,
			reason: reason,
			time: message.createdAt,
			length: 0,
		};

		client.ModCommand(message.guild.id, 'warn', uuid, member.id, message.member.id, reason);

		let otherPunishments = await client.db.punishments.get(`${message.guild.id}/${member.id}`);
		if(!otherPunishments) otherPunishments = [uuid];
		else otherPunishments.push(uuid);
		client.db.punishments.set(`${message.guild.id}/${member.id}`, otherPunishments);

		let otherWarnings = await client.db.punishments.get(`${message.guild.id}/${member.id}/warnings`);
		if(!otherWarnings) otherWarnings = [{ reason, uuid, time: message.createdAt }];
		else otherWarnings.push({ reason, uuid, time: message.createdAt });
		client.db.punishments.set(`${message.guild.id}/${member.id}/warnings`, otherWarnings);

		const amountWarned = otherWarnings.length;

		client.db.punishments.set(uuid, punishmentObj);

		message.channel.send(`Warned ${member.displayName} for ${reason}! (He has been warned ${amountWarned - 1} times before!)`);

		return member.send(`You're warned for ${reason}, don't let it happen again!`);
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