// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if (!args[1]) {
		const genArr = [], ticketArr = [], modArr = [], tagArr = [], giveArr = [], sugArr = [];
		client.cmdhelp.filter((cmd) => cmd.category === 'General').forEach((cmd) => genArr.push(cmd.name));
		client.cmdhelp.filter((cmd) => cmd.category === 'Tickets').forEach((cmd) => ticketArr.push(cmd.name));
		client.cmdhelp.filter((cmd) => cmd.category === 'Moderation').forEach((cmd) => modArr.push(cmd.name));
		client.cmdhelp.filter((cmd) => cmd.category === 'Tags').forEach((cmd) => tagArr.push(cmd.name));
		client.cmdhelp.filter((cmd) => cmd.category === 'Giveaways').forEach((cmd) => giveArr.push(cmd.name));
		client.cmdhelp.filter((cmd) => cmd.category == 'Suggestions').forEach((cmd) => sugArr.push(cmd.name));
		embed.setTitle('Commands');
		embed.addField('General', `\`${genArr.join('`, `')}\``, true);
		embed.addField('Tickets', `\`${ticketArr.join('`, `')}\``, true);
		embed.addField('Moderation', `\`${modArr.join('`, `')}\``, true);
		embed.addField('Tags', `\`${tagArr.join('`, `')}\``, true);
		embed.addField('Giveaways', `\`${giveArr.join('`, `')}\``, true);
		embed.addField('Suggestions', `\`${sugArr.join('`, `')}\``, true);
		return message.channel.send(embed);
	} else {
		let info = {};
		client.cmdhelp.filter((cmd) => cmd.name === args[1].toLowerCase()).forEach((cmd) => info = cmd);
		if (!info['name']) return message.channel.send('Enter a valid command');
		embed.setTitle(`Info about ${info['name']}`);
		embed.addField('Description :', info['description']);
		embed.addField('Usage :', info['usage']);
		return message.channel.send(embed);
	}
};


exports.help = {
	name: 'help',
	category: 'General',
	description: 'Get help',
	usage: 'help [Command=Null]',
};