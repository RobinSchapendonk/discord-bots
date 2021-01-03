// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	let active = await client.db.tickets.get(message.author.id);
	const guild = message.guild;
	const avatar = await client.getProfilePic(message.author);

	let channel = null;
	let found = true;

	try {
		if (active) channel = await client.channels.cache.get(active.channelID);
		if (active && !channel) found = false;
	} catch (e) {
		found = false;
	}

	if (!active || !found) {
		active = {};
		channel = await guild.channels.create(`${message.author.username}-Ticket`, {
			type: 'text',
			permissionOverwrites: [
				{
					type: 'role',
					id: guild.id,
					deny: ['VIEW_CHANNEL'],
				},
				{
					type: 'member',
					id: message.author.id,
					allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
				},
			],
		}).catch(async err => {
			let errors = await client.db.general.get('errors');
			if(!errors) errors = [err];
			else errors.push(err);
			client.db.general.set('errors', errors);

			message.channel.send(`Oops, it seems like something went wrong! ||(ErrorID ${errors.length - 1})||`);
		});

		if (client.TicketCategory) {
			const category = guild.channels.cache.find(c => c.id == client.TicketCategory && c.type == 'category');
			if (category) await channel.setParent(category.id, {lockPermissions: false});
		}

		if (client.supportRole) {
			const support = guild.roles.cache.find(r => r.id == client.supportRole);
			if (support) await channel.createOverwrite(support, { 'VIEW_CHANNEL': true, 'SEND_MESSAGES': true, 'READ_MESSAGE_HISTORY': true });
		}

		embed
			.setAuthor(`Hello, ${message.author.tag}`, avatar)
			.setFooter('Ticket created!');
		await channel.send(embed).catch(async err => {
			let errors = await client.db.general.get('errors');
			if(!errors) errors = [err];
			else errors.push(err);
			client.db.general.set('errors', errors);

			message.channel.send(`Oops, it seems like something went wrong! ||(ErrorID ${errors.length - 1})||`);
		});

		active.channelID = channel.id;
		active.targetID = message.author.id;
	}
	message.channel.send(`Please check <#${channel.id}> for your ticket!`);

	client.db.tickets.set(message.author.id, active);
	return client.db.tickets.set(channel.id, message.author.id);
};


exports.help = {
	name: 'new',
	category: 'Tickets',
	description: 'Create a new ticket',
	usage: 'new [Reason=No reason provided]',
};