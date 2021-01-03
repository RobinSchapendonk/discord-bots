// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.punishmentInformation)) return message.channel.send('You have no permissions to do that');

	const CaseID = args[0];
	if(!CaseID) return message.channel.send('You need to provide the CaseID!');

	const Case = await client.db.punishments.get(CaseID);
	if(!Case) return message.channel.send('That CaseID is invalid!');

	const member = await message.guild.members.fetch(Case.member);
	let avatar = null;
	if(member) {
		avatar = await client.getProfilePic(member.user);
	}

	const moderator = await message.guild.members.fetch(Case.moderator);

	embed.setTitle(Case.type);
	embed.setAuthor(member ? member.displayName : Case.member, avatar);

	embed.addField('Member', member ? member.displayName : Case.member, true);
	embed.addField('Moderator', moderator ? moderator.displayName : Case.member, true);
	embed.addField('Reason', Case.reason, true);

	let date = new Date(Case.time);
	const offset = date.getTimezoneOffset();
	date = new Date(date.getTime() + (offset * 60 * 1000)).toISOString().split('T')[0];
	embed.addField('At', date, true);
	return message.channel.send(embed);
};


exports.help = {
	name: 'punishmentinformation',
	category: 'Moderation',
	description: 'Get information about a punishment',
	usage: 'punishmentinformation <CaseID>',
};