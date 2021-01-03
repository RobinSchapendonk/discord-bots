// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('BAN_MEMBERS') && !message.member.roles.cache.get(client.config.ignorePermissions.ban)) return message.channel.send('You have no permissions to do that');
	client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
		if(member.id == message.member.id) return message.channel.send('You can\'t ban yourself!');

		const reason = args.slice(1).join(' ') || 'No reason provided';
		if(reason.length > 512) return message.channel.send(`The reason can't be longer than 512 characters! (You have ${reason.length - 512} characters too much)`);

		const positionDifference = message.member.roles.highest.comparePositionTo(member.roles.highest);
		if(positionDifference <= 0) return message.channel.send('You can\'t ban members with equal or higher position!');

		if(!member.bannable) return message.channel.send('I have no permissions to ban this user!');

		const uuid = await client.getUUID(message.channel.id, message.id);

		member.send(`You're banned for ${reason} in ${message.guild.name}, goodbye!`);

		member.ban({ reason })
			.then(async () => {
				const punishmentObj = {
					type: 'ban',
					member: member.id,
					moderator: message.member.id,
					reason: reason,
					time: message.createdAt,
					length: 0,
				};

				client.ModCommand(message.guild.id, 'ban', uuid, member.id, message.member.id, reason);

				let otherPunishments = await client.db.punishments.get(`${message.guild.id}/${member.id}`);
				if(!otherPunishments) otherPunishments = [uuid];
				else otherPunishments.push(uuid);
				client.db.punishments.set(`${message.guild.id}/${member.id}`, otherPunishments);

				let amountBanned = await client.db.punishments.get(`${message.guild.id}/${member.id}/ban`);
				if(!amountBanned) amountBanned = 1;
				else amountBanned++;
				client.db.punishments.set(`${message.guild.id}/${member.id}/ban`, amountBanned);

				client.db.punishments.set(uuid, punishmentObj);

				return message.channel.send(`Banned ${member.displayName} for ${reason}! (He has been banned ${amountBanned - 1} times before!)`);
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
	name: 'ban',
	category: 'Moderation',
	description: 'Ban a member',
	usage: 'ban <GuildMember> [Reason=No reason provided]',
};