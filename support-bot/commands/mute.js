const ms = require('ms');
// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_ROLES') && !message.member.roles.cache.get(client.config.ignorePermissions.mute)) return message.channel.send('You have no permissions to do that');
	client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
		if(member.id == message.member.id) return message.channel.send('You can\'t mute yourself!');

		const reason = args.slice(2).join(' ') || 'No reason provided';
		if(reason.length > 512) return message.channel.send(`The reason can't be longer than 512 characters! (You have ${reason.length - 512} characters too much)`);

		const positionDifference = message.member.roles.highest.comparePositionTo(member.roles.highest);
		if(positionDifference <= 0) return message.channel.send('You can\'t mute members with equal or higher position!');

		if(!member.manageable) return message.channel.send('I have no permissions to mute this user!');

		const mutedRole = message.guild.roles.cache.find(role => role.name.toLowerCase() == 'muted' || role.name.toLowerCase() == 'mute');
		if(!mutedRole) return message.channel.send('I can\'t find a muted role!');

		let timeToMute = 0;
		if(args[1]) {
			timeToMute = ms(args[1]);
		}

		if(isNaN(timeToMute)) return message.channel.send('Invalid time to mute!');

		const uuid = await client.getUUID(message.channel.id, message.id);

		member.roles.cache.forEach(role => {
			if(role.name !== '@everyone') member.roles.remove(role);
		});

		member.roles.add(mutedRole)
			.then(async () => {
				const punishmentObj = {
					type: 'mute',
					member: member.id,
					moderator: message.member.id,
					reason: reason,
					time: message.createdAt,
					length: 0,
				};

				client.ModCommand(message.guild.id, 'mute', uuid, member.id, message.member.id, reason, ms(timeToMute, { long: true }));

				let otherPunishments = await client.db.punishments.get(`${message.guild.id}/${member.id}`);
				if(!otherPunishments) otherPunishments = [uuid];
				else otherPunishments.push(uuid);
				client.db.punishments.set(`${message.guild.id}/${member.id}`, otherPunishments);

				let amountMuted = await client.db.punishments.get(`${message.guild.id}/${member.id}/mute`);
				if(!amountMuted) amountMuted = 1;
				else amountMuted++;
				client.db.punishments.set(`${message.guild.id}/${member.id}/mute`, amountMuted);

				client.db.punishments.set(uuid, punishmentObj);

				if(timeToMute > 0) {
					const unmuteObj = {
						guild: message.guild.id,
						member: member.id,
						role: mutedRole.id,
						unmute: (Date.now(message.createdAt) + timeToMute),
					};

					let mutePunishments = await client.db.punishments.get('muted');
					if(!mutePunishments) mutePunishments = [unmuteObj];
					else mutePunishments.push(unmuteObj);
					client.db.punishments.set('muted', mutePunishments);
				}

				message.channel.send(`Muted ${member.displayName} for ${reason} for ${ms(timeToMute, { long: true })}! (He has been muted ${amountMuted - 1} times before!)`);

				return member.send(`You're muted for ${reason}, don't let it happen again!`);
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
	name: 'mute',
	category: 'Moderation',
	description: 'Mute a member',
	usage: 'mute <GuildMember> [Time=0] [Reason=No reason provided]',
};