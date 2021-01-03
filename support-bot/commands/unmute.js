// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_ROLES') && !message.member.roles.cache.get(client.config.ignorePermissions.unmute)) return message.channel.send('You have no permissions to do that');
	client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
		if(member.id == message.member.id) return message.channel.send('You can\'t unmute yourself!');

		const reason = args.slice(1).join(' ') || 'No reason provided';
		if(reason.length > 512) return message.channel.send(`The reason can't be longer than 512 characters! (You have ${reason.length - 512} characters too much)`);

		const positionDifference = message.member.roles.highest.comparePositionTo(member.roles.highest);

		if(positionDifference <= 0) return message.channel.send('You can\'t unmute members with equal or higher position!');

		if(!member.manageable) return message.channel.send('I have no permissions to unmute this user!');

		const mutedRole = message.guild.roles.cache.find(role => role.name.toLowerCase() == 'muted' || role.name.toLowerCase() == 'mute');
		if(!mutedRole) return message.channel.send('I can\'t find a muted role!');

		const uuid = await client.getUUID(message.channel.id, message.id);

		member.roles.remove(mutedRole)
			.then(async () => {
				const punishmentObj = {
					type: 'unmute',
					member: member.id,
					moderator: message.member.id,
					reason: reason,
					time: message.createdAt,
					length: 0,
				};

				client.ModCommand(message.guild.id, 'unmute', uuid, member.id, message.member.id, reason);

				let otherPunishments = await client.db.punishments.get(`${message.guild.id}/${member.id}`);
				if(!otherPunishments) otherPunishments = [uuid];
				else otherPunishments.push(uuid);
				client.db.punishments.set(`${message.guild.id}/${member.id}`, otherPunishments);

				let amountUnmuted = await client.db.punishments.get(`${message.guild.id}/${member.id}/unmute`);
				if(!amountUnmuted) amountUnmuted = 1;
				else amountUnmuted++;
				client.db.punishments.set(`${message.guild.id}/${member.id}/unmute`, amountUnmuted);

				client.db.punishments.set(uuid, punishmentObj);
				message.channel.send(`Unmuted ${member.displayName} for ${reason}! (He has been unmunted ${amountUnmuted - 1} times before!)`);

				return member.send(`You're unmuted for ${reason}, don't get muted again!`);
			})
			.catch(async err => {
				let errors = await client.db.general.get('errors');
				if(!errors) errors = [err];
				else errors.push(err);
				client.db.general.set('errors', errors);

				return message.channel.send(`Oops, it seems like something went wrong! ||(ErrorID ${errors.length - 1})||`);
			});
	}).catch(invalidMemberError => {
		return message.channel.send(invalidMemberError);
	});
};


exports.help = {
	name: 'unmute',
	category: 'Moderation',
	description: 'Unmute a member',
	usage: 'unmute <GuildMember> [Reason=No reason provided]',
};