// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if(!message.member.hasPermission('MANAGE_MESSAGES') && !message.member.roles.cache.get(client.config.ignorePermissions.giveaway)) return message.channel.send('You have no permissions to do that');

	if (!args[2]) return message.channel.send('Format: `giveaway time+type winners prize --need "RoleName1 RoleName2"`');
	message.delete();
	let time = args[0];
	const timeToShow = args[0];
	const winnersAmount = parseInt(args[1].trim().replace('w', ''));
	const prize = args.slice(2).join(' ').split('--')[0];

	const timeMultiplier = time.charAt(time.length - 1);
	time = time.substring(0, time.length - 1);

	time = timeMultiplier == 'w' ? time * 604800000 : time;
	time = timeMultiplier == 'd' ? time * 86400000 : time;
	time = timeMultiplier == 'h' ? time * 3600000 : time;
	time = timeMultiplier == 'm' ? time * 60000 : time;
	time = timeMultiplier == 's' ? time * 1000 : time;

	if (winnersAmount < 1 || winnersAmount > 20) {
		return message.reply('Please choose the amount of winners between 1 and 20!').then((x) => {
			setTimeout(() => { x.delete(); }, 1000);
		});
	}

	const start = new Date();
	const startTime = start.getFullYear() + '-' + (start.getMonth() + 1) + '-' + start.getDate() + ' ' + (start.getHours()) + ':' + start.getMinutes() + ':' + start.getSeconds();

	const options = args.slice(2).join(' ').split('--').slice(1);
	const requiredRoles = [];
	const requiredRolesIDs = [];
	options.forEach((option) => {
		if (option.split(' ')[0] == 'need') {
			option.split('"')[1].split(' ').forEach((role) => {
				role = message.guild.roles.cache.find((r) => r.name == role);
				if (role) {
					requiredRoles.push(role);
					requiredRolesIDs.push(role.id);
				}
			});
		}
	});
	embed.setTitle(`🎉 ${winnersAmount} Winner${winnersAmount > 1 ? 's' : ''} 🎉`);
	embed.setDescription(`Prize: **${prize}**\n\nEnds in ${timeToShow} from starting time!${requiredRoles.length > 0 ? `\nMust have those: ${requiredRoles}` : ''}`);
	embed.setFooter(`Giveaway has started at ${startTime}`);

	message.channel.send(embed).then(async (sentGiveawayEmbed) => {
		sentGiveawayEmbed.react('🎉');
		const giveawayData = { endtime: Math.round(Date.now() + time), prize: prize, winnersAmount: winnersAmount, id: sentGiveawayEmbed.id, channelid: message.channel.id, required: requiredRolesIDs };
		let allGiveaways = await client.db.general.get('giveaways');
		if(!allGiveaways) allGiveaways = [];
		allGiveaways.push(giveawayData);
		client.db.general.set('giveaways', allGiveaways);
	});
};


exports.help = {
	name: 'giveaway',
	category: 'Giveaways',
	description: 'Start a giveaway',
	usage: 'giveaway  <Time> <Winners> <Prize> [--need "RoleName1 RoleName2"]',
};