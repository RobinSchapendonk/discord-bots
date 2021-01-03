const { createCanvas, loadImage } = require('canvas');
const { MessageAttachment } = require('discord.js');

// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	if (!args[0]) args[0] = message.author.id;
	client.GetMemberFromArg(args[0], message.guild.members).then(async member => {
		if (!member) member = message.member;
		const level = await client.db.level.get(`${message.guild.id}/${member.id}`) || 0;
		const xp = await client.db.xp.get(`${message.guild.id}/${member.id}`) || 0;
		const oldXP = await client.xpNeeded(level);
		const newXP = await client.xpNeeded(level + 1);
		const cur = (xp - oldXP);
		const next = (newXP - oldXP);
		const percent = (cur / next) * 100;
		const avatarURL = await getProfilePic(member.user);
		const buffer = (await createProgressBar({ cur, next }, level, percent, avatarURL)).toBuffer();
		const image = new MessageAttachment(buffer, 'file.png');
		embed.attachFiles([image]);
		embed.setImage('attachment://file.png');
		return message.channel.send(embed);
	}).catch(err => {
		return message.channel.send(err);
	});
};


exports.help = {
	name: 'levels',
	category: 'Levels',
	description: 'Check someone their level',
	usage: 'levels [GuildMember]',
};

async function createProgressBar(xps, level, percentage, avatarURL) {
	const AVATAR_HEIGHT = 128, AVATAR_WIDTH = 128;
	const XP_HEIGHT = 32, XP_WIDTH = 128;
	const LVL_HEIGHT = 128, LVL_WIDTH = 32;
	const canvas = createCanvas(160, 160);
	const ctx = canvas.getContext('2d');

	ctx.beginPath();
	ctx.fillStyle = 'BLACK';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.closePath();

	if (avatarURL) {
		const avatar = await loadImage(avatarURL);
		ctx.drawImage(avatar, 0, 0, AVATAR_WIDTH, AVATAR_HEIGHT);
	}

	ctx.beginPath();
	ctx.fillStyle = 'BLUE';
	ctx.fillRect(0, AVATAR_HEIGHT, Math.floor((canvas.width * percentage) / 100), XP_HEIGHT);
	ctx.closePath();

	ctx.beginPath();
	ctx.fillStyle = 'WHITE';
	ctx.font = `${XP_HEIGHT / 2}px Arial`;
	ctx.textAlign = 'center';
	ctx.fillText(`${xps.cur} / ${xps.next}`, XP_WIDTH / 2, AVATAR_HEIGHT + XP_HEIGHT - 3);
	ctx.closePath();

	ctx.beginPath();
	ctx.fillStyle = 'WHITE';
	ctx.font = `${LVL_WIDTH}px Arial`;
	ctx.textAlign = 'start';
	ctx.translate(AVATAR_WIDTH + 3, 0);
	ctx.rotate((90 * Math.PI) / 180);
	ctx.translate(-AVATAR_WIDTH + 3, -AVATAR_HEIGHT);
	ctx.fillText(`LVL: ${level}`, AVATAR_WIDTH, LVL_HEIGHT);
	ctx.closePath();

	return canvas;
}

function getProfilePic(user) {
	if (user.avatar == null) {
		return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
	} else {
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
	}
}
