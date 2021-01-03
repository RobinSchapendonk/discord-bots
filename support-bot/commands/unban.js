// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('BAN_MEMBERS') && !message.member.roles.cache.get(client.config.ignorePermissions.unban)) return message.channel.send('You have no permissions to do that');
	const userID = args[0];
	if(!userID) return message.channel.send('You need to specify the userID!');

	const reason = args.slice(1).join(' ') || 'No reason provided';
	if(reason.length > 512) return message.channel.send(`The reason can't be longer than 512 characters! (You have ${reason.length - 512} characters too much)`);

	const uuid = await client.getUUID(message.channel.id, message.id);

	message.guild.members.unban(userID, reason)
		.then(async () => {
			const punishmentObj = {
				type: 'unban',
				member: userID,
				moderator: message.member.id,
				reason: reason,
				time: message.createdAt,
				length: 0,
			};

			client.ModCommand(message.guild.id, 'unban', uuid, userID, message.member.id, reason);

			let otherPunishments = await client.db.punishments.get(`${message.guild.id}/${userID}`);
			if(!otherPunishments) otherPunishments = [uuid];
			else otherPunishments.push(uuid);
			client.db.punishments.set(`${message.guild.id}/${userID}`, otherPunishments);

			let amountUnbanned = await client.db.punishments.get(`${message.guild.id}/${userID}/unban`);
			if(!amountUnbanned) amountUnbanned = 1;
			else amountUnbanned++;
			client.db.punishments.set(`${message.guild.id}/${userID}/ban`, amountUnbanned);

			client.db.punishments.set(uuid, punishmentObj);

			return message.channel.send(`Unbanned ${userID} for ${reason}! (He has been unbanned ${amountUnbanned - 1} times before!)`);
		})
		.catch(async err => {
			let errors = await client.db.general.get('errors');
			if(!errors) errors = [err];
			else errors.push(err);
			client.db.general.set('errors', errors);

			return message.channel.send(`Oops, it seems like something went wrong! ||(ErrorID ${errors.length - 1})||`);
		});
};


exports.help = {
	name: 'unban',
	category: 'Moderation',
	description: 'Unban a member',
	usage: 'unban <UserID> [Reason=No reason provided]',
};