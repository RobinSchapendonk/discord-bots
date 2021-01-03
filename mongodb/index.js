const { Client, Collection } = require('discord.js');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const { token, prefix, mongodb } = require(path.join(__dirname, '/config.json'));
const userModel = require(path.join(__dirname, '/models/users.js'));
const guildModel = require(path.join(__dirname, '/models/guilds.js'));
const CCModel = require(path.join(__dirname, '/models/customcommands.js'));

mongoose.connect(mongodb, { useNewUrlParser: true, useUnifiedTopology: true })

const client = new Client({});
client.commands = new Collection();
client.cmdhelp = new Collection();
client.customcommands = new Collection();
client.blacklist = new Collection();
client.documents = new Collection();
client.experience = new Collection();
client.level = new Collection();

client.start = async () => {
	await client.loadCommands();
	client.login(token);
}

client.loadCommands = () => {
	return new Promise(async (resolve, reject) => {
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

		const blacklistedUsers = await userModel.find({ blacklisted: true });
		console.log(`LOG Loading a total of ${blacklistedUsers.length} blacklisted users.`);
		await blacklistedUsers.map(document => client.blacklist.set(`u.${document._id}`, true));

		const blacklistedGuilds = await guildModel.find({ blacklisted: true });
		console.log(`LOG Loading a total of ${blacklistedGuilds.length} blacklisted guilds.`);
		await blacklistedGuilds.map(document => client.blacklist.set(`g.${document._id}`, true));

		const customcommands = await CCModel.find({});
		console.log(`LOG Loading a total of ${customcommands.length} custom commands.`);
		await customcommands.map(document => client.customcommands.set(`${document.guild}.${document.name}`, document.response));

		return resolve();
	});
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

client.experienceNeededForNextLevel = (level) => {
	return Math.round(level * level + 5 * level + 50);
};

client.on('ready', async () => {
    console.log(`${client.user.tag} has started!`);
});

client.on('message', async message => {
	if (message.author.bot) return;

	const userBlacklisted = client.blacklist.get(`u.${message.member.id}`);
	const guildBlacklisted = message.guild ? client.blacklist.get(`g.${message.guild.id}`) : false;
	if (userBlacklisted || guildBlacklisted) return;

	let userDocument = await client.documents.get(message.member.id);
	if (!userDocument) userDocument = await userModel.findById(message.member.id);
	if (!userDocument) userDocument = new userModel({ _id: message.member.id });

	let experience = await client.experience.get(message.member.id);
	if (!experience) experience = userDocument.experience;
	experience += 1;

	let level = await client.level.get(message.member.id);
	if (!level) level = userDocument.level;

	const experienceNeeded = client.experienceNeededForNextLevel(level);
	if (experience >= experienceNeeded) {
		experience = experience - experienceNeeded;
		level = level + 1;

		await client.level.set(message.member.id, level);
		await client.experience.set(message.member.id, 0);

		userDocument.experience = experience;
		userDocument.level = level;

		await userDocument.save();
		await client.documents.set(message.member.id, userDocument);
		message.channel.send(`${message.member} just leveled up to level ${level}!`);
	} else {
		client.experience.set(message.member.id, experience);
	}

    if (!message.content.startsWith(prefix)) return;
	
	const args = message.content.slice(prefix.length).trim().split(/ +/g);
    let command = args.shift().toLowerCase();
    
	let extra = {};
	if (['level'].includes(command)) extra = { experience, level };
	else if (['money', 'work'].includes(command)) extra = userDocument;
	
	const cmd = client.commands.get(command + '.js');
	if (cmd && message.guild) return cmd.run(client, message, args, prefix, extra);

	const CC = client.customcommands.get(`${message.guild.id}.${command}`);
	if (CC) return message.channel.send(CC);
});

client.start();