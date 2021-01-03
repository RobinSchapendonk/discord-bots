const { MessageEmbed } = require('discord.js');
const path = require('path');
const { owners } = require(path.join(__dirname, '../config.json'));

module.exports.run = async (client, message, args, prefix) => {
    const embed = new MessageEmbed();
	if (!args[0]) {
		const genArr = [], modArr = [], levelArr = [], ecoArr = [], CCArr = [], ownerArr = [];
		
		client.cmdhelp.filter((cmd) => cmd.category === 'General').forEach((cmd) => genArr.push(cmd.name));
		client.cmdhelp.filter((cmd) => cmd.category === 'Moderation').forEach((cmd) => modArr.push(cmd.name));
		client.cmdhelp.filter((cmd) => cmd.category === 'Leveling').forEach((cmd) => levelArr.push(cmd.name));
		client.cmdhelp.filter((cmd) => cmd.category === 'Economy').forEach((cmd) => ecoArr.push(cmd.name));
		client.cmdhelp.filter((cmd) => cmd.category === 'Custom Commands').forEach((cmd) => CCArr.push(cmd.name));
		
		embed.addField('General', `\`${genArr.join('`, `')}\``);
		embed.addField('Moderation', `\`${modArr.join('`, `')}\``);
		embed.addField('Leveling', `\`${levelArr.join('`, `')}\``);
		embed.addField('Economy', `\`${ecoArr.join('`, `')}\``);
		embed.addField('Custom Commands', `\`${CCArr.join('`, `')}\``);

		embed.setDescription('[Download](https://github.com/RobinSchapendonk/discord-mongoose-systems) this bot');

		if (owners.includes(message.member.id)) {
			client.cmdhelp.filter((cmd) => cmd.category === 'Owner').forEach((cmd) => ownerArr.push(cmd.name));
			embed.addField('Owner', `\`${ownerArr.join('`, `')}\``);
		}
		return message.channel.send(embed);
	} else {
		let info = {};
		client.cmdhelp.filter((cmd) => cmd.name === args[0].toLowerCase()).forEach((cmd) => info = cmd);
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