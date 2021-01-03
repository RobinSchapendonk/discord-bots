// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if (!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.setTag)) return message.channel.send('You have no permissions to do that');
	const TagName = args.slice(0, 1)[0];
	const TagResponse = args.slice(1).join(' ');
	if(!TagName || !TagResponse) return message.channel.send('You need to specify the TagName and TagResponse!');
	await client.db.tags.set(TagName.toLowerCase(), TagResponse);
	embed.setTitle('Tag added!');
	embed.setDescription(`Name: ${TagName}\nResponse: ${TagResponse}`);
	return message.channel.send(embed);
};


exports.help = {
	name: 'settag',
	category: 'Tags',
	description: 'Set a tag',
	usage: 'settag <TagName> <TagResponse>',
};