// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
		let amountWarned = await client.db.punishments.get(`${message.guild.id}/${member.id}/warnings`);
		if(amountWarned) amountWarned = amountWarned.length;
		else amountWarned = 0;
		const amountMuted = await client.db.punishments.get(`${message.guild.id}/${member.id}/mute`) || 0;
		const amountKicked = await client.db.punishments.get(`${message.guild.id}/${member.id}/kick`) || 0;
		const amountBanned = await client.db.punishments.get(`${message.guild.id}/${member.id}/ban`) || 0;
		const invites = await client.db.invites.get(`${member.guild.id}/${member.id}`) || 0;

		const avatar = await client.getProfilePic(member.user);

		embed.setAuthor(member.displayName, avatar);
		embed.setThumbnail(avatar);

		embed.setDescription(`Warnings: ${amountWarned}, Muted: ${amountMuted}, Kicked: ${amountKicked}, Banned: ${amountBanned}`);

		embed.addField('Amount Invites', invites, true);
		embed.addField('Registered', new Date(member.user.createdAt).toUTCString(), true);
		embed.addField('Joined', new Date(member.joinedAt).toUTCString(), true);

		const roles = member.roles.cache.array().sort((a, b) => a.rawPosition > b.rawPosition ? -1 : 1);
		embed.addField(`Roles (${roles.length - 1})`, roles.slice(0, roles.length - 1).join(' ') || 'No roles');

		const permissions = member.permissions.serialize();
		let permissionsString = '';
		const permissionArray = ['Administrator', 'Manage Server', 'Manage Roles', 'Manage Channels', 'Manage Messages', 'Manage Webhooks', 'Manage Nicknames', 'Manage Emojis', 'Kick Members', 'Ban Members', 'Mention Everyone'];
		for(let i = 0; i < permissionArray.length; i++) {
			const permission = permissionArray[i];
			if(permissions[permission.toUpperCase().replace(' ', '_').replace('SERVER', 'GUILD')]) {
				permissionsString += `${permission}, `;
			}
		}
		embed.addField('Key Permissions', permissionsString.slice(0, permissionsString.length - 2) || 'No permissions');

		return message.channel.send(embed);
	}).catch(invalidMemberError => {
		return message.channel.send(invalidMemberError);
	});
};


exports.help = {
	name: 'userinfo',
	category: 'Moderation',
	description: 'Get info about a member',
	usage: 'userinfo <GuildMember>',
};