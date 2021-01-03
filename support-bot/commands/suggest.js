// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
    if (!client.config.suggestionChannel) return message.channel.send('No suggestion channel is set up!');
    const suggestionChannel = await message.guild.channels.cache.get(client.config.suggestionChannel);
    if (!suggestionChannel) return message.channel.send('An invalid suggestion channel is setup up!');
    
    const suggestion = args.join(' ');
    if (!suggestion) return message.channel.send('Please give the suggestion you want to suggest!');
    if (suggestion.length > 512) return message.channel.send(`The suggestion can't be longer than 512 characters! (You have ${suggestion.length - 512} characters too much)`);

    const uuid = await client.getUUID(message.channel.id, message.id);

    const suggestionObj = {
        type: 'suggestion',
        member: message.member.id,
        suggestion: suggestion,
        time: message.createdAt,
    };

    client.db.suggestions.set(uuid, suggestionObj);

    const avatar = await client.getProfilePic(message.author);
	embed.setThumbnail(avatar);

    embed.setTitle(`Suggestion from ${message.member.displayName}`);
    embed.addField('Suggestion ID', uuid);
    embed.setDescription(suggestion);
    
    suggestionChannel.send(embed).then(suggestionMsg => {
		message.channel.send('Sent your suggestion!');
        ['✅','❎'].map(emoji => suggestionMsg.react(emoji));
    });
};


exports.help = {
	name: 'suggest',
	category: 'Suggestions',
	description: 'Suggest a feature',
	usage: 'suggest <Suggestion>',
};