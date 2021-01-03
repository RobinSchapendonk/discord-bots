// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if (!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.deleteTag)) return message.channel.send('You have no permissions to do that');
	const TagName = args.slice(0, 1)[0];
	if(!TagName) return message.channel.send('You need to specify the TagName!');
	const Tag = await client.db.tags.get(TagName);
	if(!Tag) return message.channel.send('This tag doesn\'t exists!');
	await client.db.tags.delete(TagName);
	embed.setTitle('Tag deleted!');
	embed.setDescription(`Name: ${TagName}\nResponse: ${Tag}`);
	return message.channel.send(embed);
};


exports.help = {
	name: 'deletetag',
	category: 'Tags',
	description: 'Delete a tag',
	usage: 'delete <TagName>',
};