// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
    if (!client.config.bugChannel) return message.channel.send('No suggestion channel is set up!');
    const bugChannel = await message.guild.channels.cache.get(client.config.bugChannel);
    if (!bugChannel) return message.channel.send('An invalid suggestion channel is setup up!');

	const bug = args.join(' ');
	if (!bug) return message.channel.send('Please give the bug you want to report!');
	if (bug.length > 512) return message.channel.send(`The bug report can't be longer than 512 characters! (You have ${bug.length - 512} characters too much)`);

	const uuid = await client.getUUID(message.channel.id, message.id);

	const bugObj = {
		member: message.member.id,
		bug: bug,
		time: message.createdAt,
	};

	client.db.bugs.set(uuid, bugObj);

	const avatar = await client.getProfilePic(message.author);
	embed.setThumbnail(avatar);

	embed.setTitle(`Bug report from ${message.member.displayName}`);
	embed.addField('Bug ID', uuid);
	embed.setDescription(bug);

	bugChannel.send(embed).then(suggestionMsg => {
		message.channel.send('Sent your bug report!');
		['✅', '❎'].map(emoji => suggestionMsg.react(emoji));
	});
};


exports.help = {
	name: 'bugreport',
	category: 'Suggestions',
	description: 'Report a bug',
	usage: 'bugreport <Bug>',
};