// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.deleteWarning)) return message.channel.send('You have no permissions to do that');

	const warningUUID = args[0];
	if(!warningUUID) return message.channel.send('You need to specify the case ID!');

	const reason = args.slice(1).join(' ') || 'No reason provided';
	if(reason.length > 512) return message.channel.send(`The reason can't be longer than 512 characters! (You have ${reason.length - 512} characters too much)`);

	const warning = await client.db.punishments.get(warningUUID);
	if(!warning) return message.channel.send('I can\'t find a warning with that case ID!');
	if(warning.type !== 'warn') return message.channel.send('That case ID doesn\'t belong to a warning!!');

	const member = await message.guild.members.fetch(warning.member);

	if(member.id == message.member.id) return message.channel.send('You can\'t delete warnings of yourself!');

	const positionDifference = message.member.roles.highest.comparePositionTo(member.roles.highest);

	if(positionDifference <= 0) return message.channel.send('You can\'t delete warnings from members with equal or higher position!');

	const uuid = await client.getUUID(message.channel.id, message.id);

	const punishmentObj = {
		type: 'delwarn',
		member: member.id,
		moderator: message.member.id,
		reason: reason,
		time: message.createdAt,
		length: 0,
	};

	client.ModCommand(message.guild.id, 'delwarn', uuid, member.id, message.member.id, reason, 0, warning.reason);

	let otherPunishments = await client.db.punishments.get(`${message.guild.id}/${member.id}`);
	if(!otherPunishments) otherPunishments = [uuid];
	else otherPunishments.push(uuid);
	client.db.punishments.set(`${message.guild.id}/${member.id}`, otherPunishments);

	let otherWarnings = await client.db.punishments.get(`${message.guild.id}/${member.id}/warnings`);
	if(!otherWarnings) otherWarnings = [];
	otherWarnings = otherWarnings.filter(warningObj => warningObj.uuid !== warningUUID);
	client.db.punishments.set(`${message.guild.id}/${member.id}/warnings`, otherWarnings);

	client.db.punishments.set(uuid, punishmentObj);

	return message.channel.send(`Deleted the warning of ${member.displayName} (${warning.reason}) for ${reason}!`);
};


exports.help = {
	name: 'deletewarning',
	category: 'Moderation',
	description: 'Remove a warn of a member',
	usage: 'deletewarning <CaseID> [Reason=No reason provided]',
};