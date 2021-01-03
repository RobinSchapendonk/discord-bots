// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_CHANNELS') && !message.member.roles.cache.get(client.config.ignorePermissions.lockdown)) return message.channel.send('You have no permissions to do that');
	if(!message.channel.manageable) return message.channel.send('I can\'t lock this channel!');
	const locked = await client.db.lockdowns.get(message.channel.id);
	if(!locked) {
		const permissions = message.channel.permissionOverwrites.array();
		await client.db.lockdowns.set(message.channel.id, permissions);
		permissions.forEach(permission => {
			const allowed = permission.allow.toArray();
			if(allowed.includes('SEND_MESSAGES')) {
				message.channel.updateOverwrite(permission.id, {
					SEND_MESSAGES: false,
				}, 'LockDown');
			}
		});
		return message.channel.send('Locked this channel!');
	} else {
		message.channel.overwritePermissions(locked, 'LockDown lifted');
		await client.db.lockdowns.delete(message.channel.id);
		return message.channel.send('Unlocked this channel!');
	}
};


exports.help = {
	name: 'lockdown',
	category: 'Moderation',
	description: 'Lock a channel',
	usage: 'lockdown [Reason=No reason provided]',
};