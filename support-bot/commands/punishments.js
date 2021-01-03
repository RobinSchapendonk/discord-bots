// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.punishments)) return message.channel.send('You have no permissions to do that');
	client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
		let punishments = await client.db.punishments.get(`${message.guild.id}/${member.id}`);
		if(!punishments) punishments = [];

		let amountWarned = await client.db.punishments.get(`${message.guild.id}/${member.id}/warnings`);
		if(amountWarned) amountWarned = amountWarned.length;
		else amountWarned = 0;
		const amountMuted = await client.db.punishments.get(`${message.guild.id}/${member.id}/mute`) || 0;
		const amountKicked = await client.db.punishments.get(`${message.guild.id}/${member.id}/kick`) || 0;
		const amountBanned = await client.db.punishments.get(`${message.guild.id}/${member.id}/ban`) || 0;

		embed.setTitle(`Punishments of ${member.displayName}`);
		embed.setDescription(`(⚠️) Warn: ${amountWarned}\n(🔇) Mute: ${amountMuted}\n(👟) Kick: ${amountKicked}\n(🔨) Ban: ${amountBanned}\n\nReact with the emoji to create a new punishment!`);
		message.channel.send(embed).then(sentMessage => {
			const emojis = ['⚠️', '🔇', '👟', '🔨'];
			emojis.map(emoji => sentMessage.react(emoji));
			const filter = (reaction, user) => emojis.includes(reaction.emoji.name) && user.id === message.author.id;
			const reactionCollector = sentMessage.createReactionCollector(filter, { time: 15000, max: 1 });
			reactionCollector.on('collect', r => {
				const punishmentIndex = emojis.indexOf(r.emoji.name);
				embed.setDescription(`(⚠️) Warn: ${amountWarned}\n(🔇) Mute: ${amountMuted}\n(👟) Kick: ${amountKicked}\n(🔨) Ban: ${amountBanned}`);
				sentMessage.edit(embed);
				let punishment = null;
				switch(punishmentIndex) {
				case 0:
					punishment = 'warn';
					break;
				case 1:
					punishment = 'mute';
					break;
				case 2:
					punishment = 'kick';
					break;
				case 3:
					punishment = 'ban';
					break;
				}
				message.channel.send(`For what reason you want to ${punishment} ${member.displayName}?`);
				message.channel.awaitMessages(m => m.author.id == message.author.id, { time: 15000, max: 1 })
					.then(collected => {
						const cmd = client.commands.get(punishment + '.js');
						if(cmd) {
							const content = collected.first().content;
							embed.description = undefined;
							embed.title = undefined;
							return cmd.run(client, message, [member.id, ...content.split(' ')], prefix, embed);
						} else {
							return message.channel.send('It seems like something went wrong! Please try again later.');
						}
					})
					.catch(() => message.reply(`No answer after 15 seconds, ${punishment} cancelled.`));
			});
			reactionCollector.on('end', collected => {
				if(collected.size == 0) {
					embed.setDescription(`(⚠️) Warn: ${amountWarned}\n(🔇) Mute: ${amountMuted}\n(👟) Kick: ${amountKicked}\n(🔨) Ban: ${amountBanned}`);
					sentMessage.edit(embed);
				}
			});
		});
	}).catch(invalidMemberError => {
		return message.channel.send(invalidMemberError);
	});
};


exports.help = {
	name: 'punishments',
	category: 'Moderation',
	description: 'See the punishments of a member',
	usage: 'punishments <GuildMember>',
};