// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if (!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.tagInformation)) return message.channel.send('You have no permissions to do that');
	const TagName = args.slice(0, 1)[0];
	const Tag = await client.db.tags.get(TagName);
	if(!Tag) return message.channel.send('This tag doesn\'t exists!');
	embed.setTitle(`Tag: ${TagName}`);
	embed.setDescription(`${prefix}${TagName} sends ${Tag}`);
	return message.channel.send(embed);
};


exports.help = {
	name: 'taginfo',
	category: 'Tags',
	description: 'Get info about a tag',
	usage: 'tageinfo <TagName>',
};