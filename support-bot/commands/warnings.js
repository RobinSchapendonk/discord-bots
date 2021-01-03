// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.warnings)) return message.channel.send('You have no permissions to do that');
	client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
		let warnings = await client.db.punishments.get(`${message.guild.id}/${member.id}/warnings`);
		if(!warnings) return message.channel.send('This member has no warnings!');

		const page = parseInt(args[1]) || 1;
		warnings = warnings.slice((page - 1) * 10, (page) * 10);

		if(warnings.length == 0) return message.channel.send('This page is empty!');

		await warnings.forEach(async warning => {
			let date = new Date(warning.time);
			const offset = date.getTimezoneOffset();
			date = new Date(date.getTime() + (offset * 60 * 1000)).toISOString().split('T')[0];
			embed.addField(`Warning at ${date} (case=${warning.uuid})`, warning.reason);
		});
		return message.channel.send(embed);
	}).catch(invalidMemberError => {
		return message.channel.send(invalidMemberError);
	});
};

exports.help = {
	name: 'warnings',
	category: 'Moderation',
	description: 'Check the warnings of a member',
	usage: 'warnings <GuildMember>',
};