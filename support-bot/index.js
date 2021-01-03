const nodeMajorVersion = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajorVersion < 12) {
	console.error('Unsupported NodeJS version! Please install NodeJS 12 or newer.');
	process.exit(1);
}

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
	console.error('You need to rename config.example.json to config.json, and fill in the values!');
	process.exit(1);
}

try {
	fs.accessSync(path.join(__dirname, '.env'));
} catch (e) {
	console.error('You need to rename .env.example to .env, and fill in the values!');
	process.exit(1);
}

require('dotenv').config({path: path.join(__dirname, '.env')});
const config = require(path.join(__dirname, 'config.json'));
const prefix = config.prefix || '!';
const embedColor = config.embedColor || 'RANDOM';
const confirmEmoji = config.confirmEmoji || '✅';
const status = config.status || 'DM for help!';

if (!process.env.token) {
	console.error('You need to specify the bot token in the .env file!');
	process.exit(1);
}

if (!config.guildID) {
	console.error('You need to specify the main guild id in the config.json file!');
	process.exit(1);
}

const Discord = require('discord.js');
const bigInt = require('big-integer');
const Keyv = require('keyv');

const client = new Discord.Client();
client.db = {
	guilds: new Keyv(`sqlite://${path.join(__dirname, 'data/guilds.sqlite')}`),
	modmails: new Keyv(`sqlite://${path.join(__dirname, 'data/modmails.sqlite')}`),
	tickets: new Keyv(`sqlite://${path.join(__dirname, 'data/tickets.sqlite')}`),
	punishments: new Keyv(`sqlite://${path.join(__dirname, 'data/punishments.sqlite')}`),
	tags: new Keyv(`sqlite://${path.join(__dirname, 'data/tags.sqlite')}`),
	invites: new Keyv(`sqlite://${path.join(__dirname, 'data/invites.sqlite')}`),
	lockdowns: new Keyv(`sqlite://${path.join(__dirname, 'data/lockdowns.sqlite')}`),
	suggestions: new Keyv(`sqlite://${path.join(__dirname, 'data/suggestions.sqlite')}`),
	bugs: new Keyv(`sqlite://${path.join(__dirname, 'data/bugs.sqlite')}`),
	general: new Keyv(`sqlite://${path.join(__dirname, 'data/general.sqlite')}`),
	xp: new Keyv(`sqlite://${path.join(__dirname, 'data/xp.sqlite')}`),
	level: new Keyv(`sqlite://${path.join(__dirname, 'data/levels.sqlite')}`),
};
client.config = config;
client.messageCache = new Keyv();
client.commands = new Discord.Collection();
client.cmdhelp = new Discord.Collection();

client.loadCommands = () => {
	fs.readdir(path.join(__dirname, 'commands/'), (err, files) => {
		if (err) console.error(err);

		const jsFiles = files.filter(f => f.split('.').pop() === 'js');

		console.log(`LOG Loading a total of ${jsFiles.length} commands.`);

		jsFiles.forEach(async (f) => {
			delete require.cache[require.resolve(path.join(__dirname, `commands/${f}`))];
			const props = require(path.join(__dirname, `commands/${f}`));
			client.commands.set(f, props);
			client.cmdhelp.set(props.help.name, props.help);
		});
	});
};

client.ModCommand = async (guildID, type, uuid, memberID, moderatorID, reason, length = 0, oldReason = 'No reason provided') => {
	const ModLog = await client.db.guilds.get(`ml${guildID}`) || config.moderationLogging;
	if (!ModLog) return;
	client.channels.cache.get(ModLog).then(async channel => {
		if (channel.guild.id !== guildID) return;
		if (type !== 'unban') {
			const guild = await client.guilds.fetch(guildID);
			const member = await guild.members.fetch(memberID);
			const moderator = await guild.members.fetch(moderatorID);

			const memberAvatar = await client.getProfilePic(member.user);

			const embed = new Discord.MessageEmbed();
			embed.setTitle(`${type} ${member.user.tag} (case=\`${uuid}\`)`);
			embed.setAuthor(member.displayName, memberAvatar);
			embed.setThumbnail(memberAvatar);
			embed.addField('User', member.user.tag, true);
			embed.addField('Moderator', moderator.user.tag, true);
			embed.addField('Reason', reason, true);
			embed.setFooter(`MemberID: ${member.id}`);
			embed.setTimestamp();
			if (type == 'ban') {
				embed.setColor('#000000');
			} else if (type == 'kick') {
				embed.setColor('#ff0000');
			} else if (type == 'mute') {
				embed.addField('Length', length, true);
				embed.setColor('#ffff00');
			} else if (type == 'unmute') {
				embed.setColor('#00ff00');
			} else if (type == 'warn') {
				embed.setColor('#FFA500');
			} else if (type == 'delwarn') {
				embed.addField('oldReason', oldReason, true);
				embed.setColor('#00ff00');
			} else if (type == 'clearwarn') {
				embed.setColor('#00ff00');
			}
			return channel.send(embed);
		} else {
			const guild = await client.guilds.fetch(guildID);
			const moderator = await guild.members.fetch(moderatorID);

			const embed = new Discord.MessageEmbed();
			embed.setTitle(`${type} ${memberID} (case=\`${uuid}\`)`);
			embed.addField('User', memberID, true);
			embed.addField('Moderator', moderator.user.tag, true);
			embed.addField('Reason', reason, true);
			embed.setFooter(`MemberID: ${memberID}`);
			embed.setTimestamp();
			embed.setColor('#00ff00');
			return channel.send(embed);
		}
	});
};

client.getUUID = (channelID, messageID) => {
	return bigInt(channelID + '' + messageID).toString(36);
};

client.xpNeeded = (lvl) => {
	return 5 * (lvl ** 2) + 50 * lvl;
};

client.login(process.env.token).catch(() => {
	console.error('The token you specified is invalid!');
});

client.on('ready', () => {
	console.log(`${client.user.tag} has started!`);
	client.user.setActivity(status);
	client.loadCommands();

	client.guilds.cache.forEach(g => {
		g.fetchInvites().then(guildInvites => {
			guildInvites.array().forEach(invite => {
				if (invite.inviter) client.db.invites.set(invite.code, { uses: invite.uses, inviter: invite.inviter.id });
			});
		});
	});

	setInterval(async () => {
		let mutePunishments = await client.db.punishments.get('muted');
		if (!mutePunishments) mutePunishments = [];
		const unmutePunishments = mutePunishments.filter(punishment => punishment.unmute < Date.now());
		unmutePunishments.forEach(async (punishment) => {
			const guild = await client.guilds.fetch(punishment.guild);
			const member = await guild.members.fetch(punishment.member);
			if (!member.manageable) guild.owner.send(`I can't unmute ${member.displayName} (${member.id})! Please unmute him yourself!`);
			await member.roles.remove(punishment.role);

			const reason = 'Automatic unmute';
			const uuid = await client.getUUID(member.id, punishment.unmute);

			const punishmentObj = {
				type: 'unmute',
				member: member.id,
				moderator: member.id,
				reason,
				time: punishment.unmute,
				length: 0,
			};

			client.ModCommand(member.guild.id, 'unmute', uuid, member.id, client.user.id, reason);

			let otherPunishments = await client.db.punishments.get(`${member.guild.id}/${member.id}`);
			if (!otherPunishments) otherPunishments = [uuid];
			else otherPunishments.push(uuid);
			client.db.punishments.set(`${member.guild.id}/${member.id}`, otherPunishments);

			let amountUnmuted = await client.db.punishments.get(`${member.guild.id}/${member.id}/unmute`);
			if (!amountUnmuted) amountUnmuted = 1;
			else amountUnmuted++;
			client.db.punishments.set(`${member.guild.id}/${member.id}/unmute`, amountUnmuted);

			client.db.punishments.set(uuid, punishmentObj);

			mutePunishments = await client.db.punishments.get('muted');
			mutePunishments = mutePunishments.filter(pun => punishment.guild !== pun.guild && punishment.member !== pun.member && pun.role !== pun.role && punishment.unmute !== pun.unmute);
			client.db.punishments.set('muted', mutePunishments);
		});
		const giveaways = await client.db.general.get('giveaways');
		if (!giveaways) return client.db.general.set('giveaways', []);
		for (let i = 0; i < giveaways.length; i++) {
			if (giveaways[i].endtime < Date.now()) {
				const curGiveaway = giveaways.splice(i, 1);
				client.db.general.set('giveaways', giveaways);
				const prize = curGiveaway[0].prize;
				const channel = await client.channels.cache.get(curGiveaway[0].channelid);
				channel.messages.fetch(curGiveaway[0].id).then(async (sentGiveawayEmbed) => {
					const tempUsers = await fetchReactedUsers(sentGiveawayEmbed.reactions.cache.get('🎉'));
					const users = [];
					tempUsers.forEach(async (user) => {
						const member = await channel.guild.members.fetch(user.id);
						if (member && !user.bot) {
							if (curGiveaway[0].required.length !== 0) {
								const roles = member.roles.cache;
								let needed = curGiveaway[0].required;
								needed = needed.filter(neededRoleID => roles.has(neededRoleID));
								if (needed.length == curGiveaway[0].required.length) users.push(user);
							} else {
								users.push(user);
							}
						}
					});
					const winnersAmount = curGiveaway[0].winnersAmount > users.length ? users.length : curGiveaway[0].winnersAmount;
					if (users.length == 0) {
						const noWinnerEmbed = new Discord.MessageEmbed()
							.setTitle('🎉 The giveaway has ended 🎉')
							.setDescription(`Prize: ${prize}.\n\nWinner${winnersAmount > 1 ? 's' : ''}: None (no valid users found that reacted)`)
							.setColor(embedColor);
						sentGiveawayEmbed.edit(noWinnerEmbed);
					} else {
						const winners = [];
						for (i = 0; i < winnersAmount; i++) {
							const winner = draw(users);
							!winners.includes(winner) ? winners.push(winner) : i = Math.round(i - 1);
						}
						const winnersGiveawayEmbed = new Discord.MessageEmbed()
							.setTitle('🎉 The giveaway has ended 🎉')
							.setDescription(`Prize: ${prize}.\n\nWinner${winnersAmount > 1 ? 's' : ''}: ${winners.filter((u) => u !== undefined && u !== null).map((u) => u.toString()).join(', ')}`)
							.setColor(embedColor);
						sentGiveawayEmbed.edit(winnersGiveawayEmbed);
						channel.send(`🎉-Congrats to ${winners.filter((u) => u !== undefined && u !== null).map((u) => u.toString()).join(', ')} for winning ${prize}`);
					}
				});
			}
		}
	}, 30000);
});

client.on('message', async message => {
	if (message.author.bot) return;

	const embed = new Discord.MessageEmbed().setColor(embedColor);
	const args = message.content.slice(prefix.length).trim().split(/ +/g);
	let command = args.shift().toLowerCase();
	const tag = await client.db.tags.get(command);

	const last = await client.messageCache.get(`${message.channel.id}/${message.author.id}`);
	if (message.guild) {
		if (!last || Date.now() - last > 10000) {
			await client.messageCache.set(`${message.channel.id}/${message.author.id}`, Date.now());
			const xp = await client.db.xp.get(`${message.guild.id}/${message.author.id}`) || 0;
			const newXP = xp + 1;
			await client.db.xp.set(`${message.guild.id}/${message.author.id}`, newXP);
			const lvl = await client.db.level.get(`${message.guild.id}/${message.author.id}`) || 0;
			if (newXP >= client.xpNeeded(lvl + 1)) {
				await client.db.level.set(`${message.guild.id}/${message.author.id}`, lvl + 1);
				message.channel.send(`GG ${message.member}, you just got level ${lvl + 1}`);
			}
		}
	}

	if (['a'].includes(command)) command = 'add';
	if (['b'].includes(command)) command = 'ban';
	if (['clearwarn', 'clearwarning', 'cw', 'cwarn', 'cwarning', 'cwarnings'].includes(command)) command = 'clearwarnings';
	if (['c'].includes(command)) command = 'close';
	if (['dt', 'deltag'].includes(command)) command = 'deletetag';
	if (['delwarn', 'delwarning', 'dw'].includes(command)) command = 'deletewarning';
	if (['give', 'start'].includes(command)) command = 'giveaway';
	if (['h'].includes(command)) command = 'help';
	if (['k'].includes(command)) command = 'kick';
	if (['rank', 'level'].includes(command)) command = 'levels';
	if (['lock'].includes(command)) command = 'lockdown';
	if (['m'].includes(command)) command = 'mute';
	if (['n'].includes(command)) command = 'new';
	if (['caseinfo', 'caseinformation', 'ci', 'pi', 'punishmentinfo'].includes(command)) command = 'punishmentinformation';
	if (['p', 'pm', 'punish', 'punishment'].includes(command)) command = 'punishments';
	if (['r'].includes(command)) command = 'remove';
	if (['rep'].includes(command)) command = 'report';
	if (['st'].includes(command)) command = 'settag';
	if (['sug'].includes(command)) command = 'suggest';
	if (['tagi', 'taginformation', 'ti'].includes(command)) command = 'taginformation';
	if (['ub'].includes(command)) command = 'unban';
	if (['um'].includes(command)) command = 'unmute';
	if (['ui', 'uinfo', 'useri', 'userinfo'].includes(command)) command = 'userinformation';
	if (['w'].includes(command)) command = 'warn';
	if (['ws'].includes(command)) command = 'warnings';

	if (tag) {
		message.channel.send(tag);
	}

	const cmd = client.commands.get(command + '.js');
	if (cmd && message.guild && !message.author.bot && message.content.startsWith(prefix)) {
		if (!message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS')) return message.channel.send('I don\'t have permission to send embed messages!');
		embed.setFooter(`${Buffer.from('TWFkZSBieSA8L1JvYmluU2NoPiM3OTk0', 'base64').toString('utf-8')}`);
		embed.setAuthor(message.member.displayName, message.author.avatarURL());
		return cmd.run(client, message, args, prefix, embed);
	}


	if (command == 'eval') {
		if (!config.owners.includes(message.author.id)) return;
		try {
			const code = args.join(' ');
			let evaled = eval(code);

			if (typeof evaled !== 'string') { evaled = require('util').inspect(evaled); }

			message.channel.send(clean(evaled), { code: 'xl' });
		} catch (err) {
			message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
		}
	}


	if (message.guild === null && !message.author.bot) {
		let active = await client.db.modmails.get(message.author.id);
		const guild = await client.guilds.fetch(config.guildID);
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
			channel = await guild.channels.create(`${message.author.username}-ModMail`, {
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
				if (!errors) errors = [err];
				else errors.push(err);
				client.db.general.set('errors', errors);

				message.channel.send(`Oops, it seems like something went wrong! ||(ErrorID ${errors.length - 1})||`);
			});

			if (config.ModMailCategory) {
				const category = guild.channels.cache.find(c => c.id == config.ModMailCategory && c.type == 'category');
				if (category) await channel.setParent(category.id);
			}

			if (config.supportRole) {
				const support = guild.roles.cache.find(r => r.id == config.supportRole);
				if (support) await channel.createOverwrite(support, { 'VIEW_CHANNEL': true, 'SEND_MESSAGES': true, 'READ_MESSAGE_HISTORY': true });
			}

			embed
				.setAuthor(`Hello, ${message.author.tag}`, avatar)
				.setFooter('ModMail ticket created!');
			await message.author.send(embed).catch(async err => {
				let errors = await client.db.general.get('errors');
				if (!errors) errors = [err];
				else errors.push(err);
				client.db.general.set('errors', errors);

				message.channel.send(`Oops, it seems like something went wrong! ||(ErrorID ${errors.length - 1})||`);
			});

			active.channelID = channel.id;
			active.targetID = message.author.id;
		}

		channel = await client.channels.cache.get(active.channelID);
		
		const attachments = message.attachments.array();
		const files = [];
		attachments.map(attachment => files.push(attachment.url));

		channel.fetchWebhooks().then((webhooks) => {
			const foundHook = webhooks.find((webhook) => webhook.name == 'modmail');
			if (!foundHook) {
				channel.createWebhook('modmail')
					.then((webhook) => {
						webhook.send(message.content, {
							username: message.author.username,
							avatarURL: avatar,
							files
						});
					});
			} else {
				foundHook.send(message.content, {
					username: message.author.username,
					avatarURL: avatar,
					files
				});
			}
		});
		message.react(confirmEmoji);
		client.db.modmails.set(message.author.id, active);
		return client.db.modmails.set(channel.id, message.author.id);
	}

	let support = await client.db.modmails.get(message.channel.id);
	if (support && !message.content.startsWith(prefix) && !message.author.bot) {
		support = await client.db.modmails.get(support);
		const supportUser = await client.users.fetch(support.targetID);
		if (!supportUser) return message.channel.delete();

		const attachments = message.attachments;
		const files = [];
		attachments.map(attachment => files.push(attachment.url));

		supportUser.send(message.content, {
			files
		});

		return message.react(confirmEmoji);
	}
});

client.on('guildMemberAdd', async member => {
	if (!member.user.bot) {
		let mutePunishments = await client.db.punishments.get('muted');
		if (!mutePunishments) mutePunishments = [];
		const userPunishments = mutePunishments.find(punishment => punishment.member == member.id && punishment.guild == member.guild.id);
		if (userPunishments) {
			member.roles.cache.forEach(role => {
				if (role.name !== '@everyone') member.roles.remove(role);
			});
			member.roles.add(userPunishments.role);
		}
		member.guild.fetchInvites().then(async guildInvites => {
			guildInvites.array().forEach(async invite => {
				const oldInvite = await client.db.invites.get(invite.code);
				client.db.invites.set(invite.code, invite.uses);
				if (oldInvite.uses < invite.uses) {
					console.log(`${oldInvite.inviter} invited ${member.id}`);
					const oldCount = await client.db.invites.get(`${member.guild.id}/${oldInvite.inviter}`) || 0;
					await client.db.invites.set(`${member.guild.id}/${oldInvite.inviter}`, oldCount + 1);
				}
			});
		});
	}
});

client.on('inviteCreate', invite => {
	client.db.invites.set(invite.code, { uses: invite.uses, inviter: invite.inviter.id });
});

client.getProfilePic = (user) => {
	if (user.avatar == null) {
		return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
	} else {
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
	}
};

client.GetMemberFromArg = (argument, members) => {
	return new Promise(async (resolve, reject) => {
		const multiplefound = 'I found multiple members, be more precise!';
		if (!argument) return reject('You didn\'t provided an argument!');

		// Mentioned Member //
		if (argument.startsWith('<@') && argument.endsWith('>')) {
			let id = argument.slice(2, -1);
			if (id.startsWith('!')) id = id.slice(1);
			const member = await members.fetch(id);
			if (member) return resolve(member);
		}

		// Member ID //
		if (await members.fetch(argument)) return resolve(await members.fetch(argument));

		// Username //
		const usernames = members.cache.filter((member) => member.user.username === argument);
		if (usernames.size === 1) return resolve(usernames.first());
		else if (usernames.size > 1) return reject(multiplefound);

		// Nickname
		const nicknames = members.cache.filter((member) => member.nickname === argument);
		if (nicknames.size === 1) return resolve(nicknames.first());
		else if (nicknames.size > 1) return reject(multiplefound);

		// Username#Tag
		const usertags = members.cache.filter((member) => member.user.tag === argument);
		if (usertags.size === 1) return resolve(usertags.first());
		else if (usertags.size > 1) return reject(multiplefound);

		return reject('I didn\'t found any member!');
	});
};

function shuffle(arr) {
	for (let i = arr.length; i; i--) {
		const j = Math.floor(Math.random() * i);
		[arr[i - 1], arr[j]] = [arr[j], arr[i - 1]];
	}
	return arr;
}
function draw(list) {
	const shuffled = shuffle(list);
	return shuffled[Math.floor(Math.random() * shuffled.length)];
}
async function fetchReactedUsers(reaction, after) {
	const opts = { limit: 100, after };
	const reactions = await reaction.users.fetch(opts);
	if (!reactions.size) return [];

	const last = reactions.last().id;
	const next = await fetchReactedUsers(reaction, last);
	return reactions.array().concat(next);
}
const clean = text => {
	if (typeof (text) === 'string') {
		return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203));
	} else {
		return text;
	}
};
