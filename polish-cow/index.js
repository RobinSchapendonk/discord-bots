require('dotenv').config({path: __dirname + '/.env'});
const { TOKEN } = process.env;
const { prefix, invite } = require(__dirname + '/config.json');
const { Client, MessageEmbed, MessageAttachment } = require('discord.js');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(__dirname + '/database.sqlite');

const client = new Client({
    messageCacheMaxSize: 60,
    messageCacheLifetime: 60,
    messageSweepInterval: 60,
    presence: {
        status: 'dnd',
        activity: {
            type: 'LISTENING',
            name: 'polish cow',
        }
    }
});

client.on('ready', async () => {
    console.log(`${client.user.tag} logged in!`);
    db.run('CREATE TABLE IF NOT EXISTS guilds (id TEXT, voice TEXT)');
    db.each("SELECT voice FROM guilds", async function(err, row) {
        if (row) {
            try {
                const voiceChannel = await client.channels.fetch(row.voice);
                if (!voiceChannel || !voiceChannel.joinable) return;
                const connection = await voiceChannel.join();
                return play(connection);
            } catch (e) {
                return db.run('DELETE FROM guilds WHERE voice = ?', [row.voice]);
            }
        }
    });
});

client.on('message', async (message) => {
    if (!message.guild.me.permissionsIn(message.channel.id).has('SEND_MESSAGES')) return;
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/g);
    let command = args.shift().toLowerCase();

    if (['p', 's', 'start'].includes(command)) command = 'play';
    if (['h'].includes(command)) command = 'help';
    if (['i', 'link', 'links', 'support'].includes(command)) command = 'invite';
    if (['binfo', 'botinfo', 'information'].includes(command)) command = 'info';

    if (message.content.includes(`<@${client.user.id}`) || message.content.includes(`<@!${client.user.id}>`)) return message.channel.send(`My prefix is \`${prefix}\`!`);
    
    if (command == 'play') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return error(message.channel, 'The polish cow doesn\'t know in which channel he needs to dance!');
        if (!voiceChannel.joinable) return error(message.channel, 'The polish cow can\'t join the channel!');

        const connection = await voiceChannel.join();
        db.run('DELETE FROM guilds WHERE id = ?', [message.guild.id]);
        db.run('INSERT INTO guilds VALUES (?,?)', [message.guild.id, voiceChannel.id]);

        const embed = new MessageEmbed()
            .setColor('#00ff00');

        if (message.guild.me.permissionsIn(message.channel.id).has('ATTACH_FILES')) {
            const attachment = new MessageAttachment(__dirname + '/dancing.gif', 'dancing.gif');
            embed
                .setTitle('The polish cow has started dancing!')
                .attachFiles([attachment])
                .setThumbnail('attachment://dancing.gif')
        } else {
            embed
                .setTitle('The polish cow has started dancing!')
                .setDescription('(Did you know, with `ATTACH_FILES` permission it\'s even cooler?)');
        }
        await play(connection);
        return message.channel.send(embed).catch(() => {
            return message.channel.send('The polish cow has started dancing! (Did you know, with `EMBED_LINK` permission it\'s even cooler?)');
        });
    } else if (command == 'invite') {
        const embed = new MessageEmbed()
            .setTitle('Click here to invite the polish cow!')
            .setURL(invite)
            .setColor('#00ff00');
            
        if (message.guild.me.permissionsIn(message.channel.id).has('ATTACH_FILES')) {
            const attachment = new MessageAttachment(__dirname + '/dancing.gif', 'dancing.gif');
            embed
                .attachFiles([attachment])
                .setThumbnail('attachment://dancing.gif')
        } else embed.setDescription('(Did you know, with `ATTACH_FILES` permission it\'s even cooler?)');

        return message.channel.send(embed).catch(() => {
            return message.channel.send(`${invite}\n(Did you know, with \`EMBED_LINK\` permission it\'s even cooler?)`);
        });
    } else if (command == 'help') {
        const embed = new MessageEmbed()
            .setTitle('Help')
            .setColor('#00ff00');
        let description = `${prefix}play => start dancing in the current voice channel.\n`;
        description += `${prefix}info => get info about the polish cow (song).\n`;
            
        if (message.guild.me.permissionsIn(message.channel.id).has('ATTACH_FILES')) {
            const attachment = new MessageAttachment(__dirname + '/dancing.gif', 'dancing.gif');
            embed
                .attachFiles([attachment])
                .setThumbnail('attachment://dancing.gif')
        } else description += '\n(Did you know, with `ATTACH_FILES` permission it\'s even cooler?)';

        embed.setDescription(description);
        return message.channel.send(embed).catch(() => {
            return message.channel.send(`${invite}\n(Did you know, with \`EMBED_LINK\` permission it\'s even cooler?)`);
        });
    } else if (command == 'info') {
        const embed = new MessageEmbed()
            .setTitle('Help')
            .setColor('#00ff00')
            .addField('About', 'Tylko Jedno W Głowie Mam are the opening lyrics of the song "Gdzie jest biały węgorz ? (Zejście)" by Polish musical artist Cyprian "Cypis" Racicki. The song exploded in popularity in July 2020 after it was included in various dancing videos, most notably a dancing cow dubbed Polish Cow.')
            .addField('Origin', 'On October 19th, 2015, Polish artist Cypis published a song called "Gdzie jest biały węgorz ? (Zejście)" to YouTube. In under five years, it has received over ten million views and 160,000 likes. The video gained over 3.2 million views from August 11th to the 27th.')
            .addField('Spread (p1)', 'How the song spread is unclear, but a number of dancing videos set to it began appearing in mid-July 2020. On July 13th, 2020, a one hour loop of a cow dancing to the song\'s opening was uploaded by user Dejman, gaining over 100,000 views in under a month. On the same day, a dancing triangle video with a loop of the opening of the song was uploaded by user chomik13, garnering over 460,000 views in the same period.\nA July 16th one hour version of the cow dancing to the first three lines of the song was uploaded by FOXUNE, gaining more than 1.7 million views in under a month.\n')
            .addField('Spread (p2)', 'On July 22nd, YouTube user 121212ad uploaded a demotivational tunnel video with the song featuring a GIF of a dinosaur and frog dancing. The video was re-uploaded to TikTok by siemqatukopi on July 26th, where it garnered over 410,000 views and 82,000 likes in two weeks. On July 25th, a Polish-language Peppa Pig grown-up music parody was posted to YouTube by bartix271 that received over 110,000 views in a similar period.\nOn July 28th, Cypis acknowledged the song\'s increase in popularity by posting an Instagram video featuring a boy dancing to the song On July 31st, Cypis uploaded a remix of Gdzie jest biały węgorz ? to his YouTube channel that gained over 600,000 views in under two weeks.\nOn August 8th, Polish YouTuber Tomasz "Gimper" Działowy talked about the song in a video titled with its opening lyrics, receiving over 600,000 views in three days. Polish YouTuber REMBOL reacted to and mentioned the song numerous times in an August 9th video. In two days, it garnered over 70,000 views.')
            .addField('This bot', `With the ${prefix}play command, the polish cow will join your voice channel, and will play the song forever (on loop). The only way to stop it is to disconnect the polish cow.`);
            
        if (message.guild.me.permissionsIn(message.channel.id).has('ATTACH_FILES')) {
            const attachment = new MessageAttachment(__dirname + '/dancing.gif', 'dancing.gif');
            embed
                .attachFiles([attachment])
                .setThumbnail('attachment://dancing.gif')
        } else embed.setDescription('\n(Did you know, with `ATTACH_FILES` permission it\'s even cooler?)');

        return message.channel.send(embed).catch(() => {
            return message.channel.send(`${invite}\n(Did you know, with \`EMBED_LINK\` permission it\'s even cooler?)`);
        });
    }
});

const play = async (connection) => {
    return connection.play(__dirname + '/song.mp3').on('finish', () => play(connection));
};

const error = async (channel, message) => {
    const embed = new MessageEmbed()
        .setTitle(message)
        .setColor('#ff0000');
    return channel.send(embed).catch(() => {
        return channel.send(message);
    });
}

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.id !== client.user.id || !oldState.channel || newState.channel) return;
    return db.run('DELETE FROM guilds WHERE voice = ?', [oldState.channel.id]);
});

client.login(TOKEN);