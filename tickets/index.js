const nodeMajorVersion = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajorVersion < 12) {
	console.error('Unsupported NodeJS version! Please install NodeJS 12 or newer.');
	process.exit(1);
}

// Verify node modules have been installed
const fs = require('fs');
const path = require('path');

try {
	fs.accessSync(path.join(__dirname, 'node_modules'));
} catch (e) {
	console.error('Please run "npm i" or run the install.bat before starting the bot!');
	process.exit(1);
}

try {
	fs.accessSync(path.join(__dirname, 'config.json'));
} catch (e) {
	console.error('You need to copy config.example.json to config.json, and fill in the values!');
	process.exit(1);
}


const discord = require('discord.js');
const sqlite3 = require('sqlite3');
const config = require('./config.json');

const prefix = config.prefix || '!';
if (config.ticketReaction.includes('EMOJI')) config.ticketReaction = config.ticketReaction.split('EMOJI').join(config.emoji || '✅');


const database = new sqlite3.Database('database.db');
const client = new discord.Client({ partials: ['MESSAGE', 'REACTION'] });
client.login(config.token);
client.checkPermission = (permission, message) => {
	if (!message.channel.permissionsFor(message.guild.me).has(permission)) {
		return message.channel.send(`Missing ${permission} permissions!`);
	} else {
		return;
	}
};
client.getUserFromArg = (argument, members) => {
	return new Promise((resolve, reject) => {
		const multiplefound = 'I found multiple users, be more precise!';
		if (!argument) return reject('You didn\'t provided an argument!');
		if (argument.startsWith('<@') && argument.endsWith('>')) {
			let id = argument.slice(2, -1);
			if (id.startsWith('!')) id = id.slice(1);
			const member = members.cache.get(id);
			if (member) return resolve(member);
		}
		if (members.cache.get(argument)) return resolve(members.cache.get(argument));
		const usernames = members.cache.filter((member) => member.user.username === argument);
		if (usernames.size === 1) return resolve(usernames.first());
		else if (usernames.size > 1) return reject(multiplefound);
		const nicknames = members.cache.filter((member) => member.nickname === argument);
		if (nicknames.size === 1) return resolve(nicknames.first());
		else if (nicknames.size > 1) return reject(multiplefound);
		const tags = members.cache.filter((member) => member.user.tag === argument);
		if (tags.size === 1) return resolve(tags.first());
		else if (tags.size > 1) return reject(multiplefound);
		return reject('I didn\'t found any user!');
	});
};
client.on('ready', () => {
	database.serialize(function () {
		database.run('CREATE TABLE if not exists channels (channel TEXT, author TEXT, reason TEXT, messages TEXT, open TEXT)');
		database.run('CREATE TABLE if not exists ticketreactions (message TEXT)');
	});
	client.user.setActivity(config.status);
	console.log('Bot has started!');
});

client.on('messageReactionAdd', (reaction, user) => {
	if (user.bot) return;
	database.all('SELECT * from ticketreactions', async (err, ticketreactions = []) => {
		const ticketreaction = ticketreactions.filter((data) => data.message == reaction.message.id);
		if (ticketreaction.length == 1) {
			if (reaction._emoji.name == config.emoji || reaction._emoji.name == "✅") {
				reaction.users.remove(user);
				database.all('SELECT * from channels', async (err, channels = []) => {
					const alreadyOpened = !!channels.find(data => data.author == user.id && data.open == 'true');
					if (alreadyOpened) return user.send(config.alreadyOpened || 'You already have an opened ticket!');
					const permissionOverwrites = [{ id: reaction.message.guild.id, deny: ['VIEW_CHANNEL'] }];
					if (config.supportRole) permissionOverwrites.push({ id: config.supportRole, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] });
					reaction.message.guild.channels
						.create(`ticket-${channels.length++}`, { permissionOverwrites, type: 'text' })
						.then((channel) => {
							const reason = config.defaultReason ? config.defaultReason + ' (opened with ticketreaction)' : 'No reason specified (opened with a reaction)';
							if (config.ticketCategory) channel.setParent(config.ticketCategory);
							database.run('INSERT INTO channels (channel, author, reason, messages, open) VALUES (?,?,?,?,?)', [channel.id, user.id, reason, '[]', 'true']);
							const embed = new discord.MessageEmbed().setTitle(reason);
							if (config.openMessage) embed.setDescription(config.openMessage);
							channel.send(embed);
						});
				});
			}
		}
	});
});

client.on('message', (message) => {
	if (message.channel.type !== 'text') return;
	if (message.author.bot) return;
	database.all(`SELECT * from channels WHERE channel='${message.channel.id}'`, async (err, data = []) => {
		if (data.length > 0) {
			let messages = JSON.parse(data[0].messages);
			const attachments = message.attachments.array();
			for (let attachmentsIndex = 0; attachmentsIndex < attachments.length; attachmentsIndex++) {
				message.content = message.content + ' ' + attachments[attachmentsIndex].proxyURL;
			}
			messages.push({ author: message.author.tag, message: message.content, date: message.createdAt });
			messages = `${JSON.stringify(messages)}`;
			database.run(`UPDATE channels SET messages=? WHERE channel='${message.channel.id}'`, messages);
		}
	});
	if (!message.content.startsWith(prefix)) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();
	const embed = new discord.MessageEmbed()
		.setColor(config.embedColor || 'RANDOM');
	if (command == 'new') {
		client.checkPermission('MANAGE_CHANNELS', message);
		database.all(`SELECT * from channels WHERE author="${message.author.id}" AND open="true"`, async (err, temp = []) => {
			if (temp.length > 0) return message.channel.send(config.alreadyOpened || 'You already have an opened ticket!');
			const reason = args.join(' ') || config.defaultReason || 'No reason provided';
			if (args.length == 0 && config.needReasonToOpen.toLowerCase() !== 'false') {
				embed.setTitle(config.needReasonToOpen || 'Please give a reason to open it!');
				return message.channel.send(embed);
			}
			database.all('SELECT * from channels', async (err, datas = []) => {
				const permissionOverwrites = [{ id: message.guild.id, deny: ['VIEW_CHANNEL'] }, { id: message.author.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }];
				if (config.supportRole) permissionOverwrites.push({ id: config.supportRole, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] });
				message.guild.channels
					.create(`ticket-${datas.length++}`, { permissionOverwrites, type: 'text' })
					.then((channel) => {
						if (config.ticketCategory) channel.setParent(config.ticketCategory);
						database.run('INSERT INTO channels (channel, author, reason, messages, open) VALUES (?,?,?,?,?)', [channel.id, message.author.id, reason, '[]', 'true']);
						if (config.openMessage) embed.setDescription(config.openMessage);
						embed.setTitle(`Reason: ${reason}`);
						channel.send(embed);
						message.delete();
						message.channel.send(`I created a ticket for you <#${channel.id}>!`);
					});
			});
		});
	} else if (command == 'close') {
		client.checkPermission('MANAGE_CHANNELS', message);
		database.all(`SELECT * from channels WHERE channel='${message.channel.id}' AND open='true'`, async (err, datas = []) => {
			if (err || datas.length == 0) {
				embed.setTitle(config.noSupport || 'This is not a support ticket!');
				return message.channel.send(embed);
			}
			const openReason = datas[0].reason || config.defaultReason || 'No reason provided';
			const closeReason = args.join(' ') || config.defaultReason || 'No reason provided';
			if (args.length == 0 && config.needReasonToClose.toLowerCase() !== 'false') {
				embed.setTitle(config.needReasonToClose || 'Please give a reason to close it!');
				return message.channel.send(embed);
			}
			fs.appendFile(`${message.channel.name}.txt`, `Open reason: ${openReason}, Close reason: ${closeReason}\n\n`, function (err) {
				if (err) throw err;
			});
			datas = datas[0].messages;
			datas = JSON.parse(datas);
			datas.sort((a, b) => a - b);
			datas.forEach((row) => {
				fs.appendFile(`${message.channel.name}.txt`, `[${new Date(row.date).toUTCString()}] ${row.author}: ${row.message}\n`, function (err) {
					if (err) throw err;
				});
			});
			message.channel.delete(closeReason);
			database.all('SELECT * from channels', async (err, datas2 = []) => {
				let closeMessage = '';
				if (config.closeMessage) closeMessage = config.closeMessage;
				embed.setTitle(`${closeMessage}\nReason: ${closeReason}`);
				embed.attachFiles([{ attachment: `${message.channel.name}.txt` }]);
				const member = message.guild.members.cache.get(datas2[message.channel.name.slice(7, message.channel.name.length)].author);
				await member.send(embed);
				embed.setTitle(`Closed ticket of ${member.user.tag}\nClosed by ${message.member.user.tag}\nReason: ${closeReason}`);
				if (config.ticketLogs) {
					const channel = message.guild.channels.cache.get(config.ticketLogs);
					channel.send(embed);
				}
				database.run(`UPDATE channels SET open='false' WHERE channel='${message.channel.id}'`);
			});
		});
	} else if (command == 'add') {
		database.all(`SELECT messages from channels WHERE channel='${message.channel.id}' AND open='true'`, async (err, datas = []) => {
			if (err || datas.length == 0) {
				embed.setTitle(config.noSupport || 'This is not a support ticket!');
				return message.channel.send(embed);
			}
			client.getUserFromArg(args[0], message.guild.members).then(member => {
				message.channel.createOverwrite(member.id, {
					SEND_MESSAGES: true,
					VIEW_CHANNEL: true,
				});
				embed.setTitle('I added him!');
				return message.channel.send(embed);
			}).catch(err => {
				embed.setTitle(err);
				return message.channel.send(embed);
			});
		});
	} else if (command == 'remove') {
		database.all(`SELECT messages from channels WHERE channel='${message.channel.id}' AND open='true'`, async (err, datas = []) => {
			if (err || datas.length == 0) {
				embed.setTitle(config.noSupport || 'This is not a support ticket!');
				return message.channel.send(embed);
			}
			client.getUserFromArg(args[0], message.guild.members).then(member => {
				message.channel.createOverwrite(member.id, {
					SEND_MESSAGES: false,
					VIEW_CHANNEL: false,
				});
				embed.setTitle('I removed him!');
				return message.channel.send(embed);
			}).catch(err => {
				embed.setTitle(err);
				return message.channel.send(embed);
			});
		});
	} else if (command == 'ticketreaction') {
		if (message.author.id !== message.guild.owner.id) return message.channel.send('You need to be owner to create this!');
		embed.setDescription(config.ticketReaction || `React with ${config.emoji || "✅"} to create a support ticket!`);
		message.channel.send(embed).then((msg) => {
			database.run('INSERT INTO ticketreactions (message) VALUES (?)', [msg.id]);
			msg.react(config.emoji || "✅");
		});
	} else if (command == 'help') {
		let description = 'botinfo -> get info about the bot\nnew <reason> -> opens a ticket\nclose <reason> -> closes a ticket\nadd <user> -> adds an user\nremove <user> -> removes an user';
		if (message.author.id == message.guild.owner.id) description += '\nticketreaction -> creates a message to react to open a ticket';
		embed.setTitle('help');
		embed.setDescription(description);
		message.channel.send(embed);
	} else if (command == 'botinfo') {
		embed.setTitle('**Ticket Bot Information.**');
		embed.setDescription(`**Version:** ${require('./package.json').version}\n **Made By:** </RobinSch>#7994\n **Want to Purchase?** https://shortrsg.cf/discord`);
		message.channel.send(embed);
	}
});