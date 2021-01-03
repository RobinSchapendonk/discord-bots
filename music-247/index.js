require('dotenv').config({path: __dirname + '/.env'});
const { TOKEN } = process.env;
const { prefix, invite } = require(__dirname + '/config.json');

const { Client, Collection } = require('discord.js');
const { readdirSync } = require('fs');
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
            name: '24/7 music',
        }
    }
});
client.queues = new Collection();

client.on('ready', async () => {
    console.log(`${client.user.tag} logged in!`);

    db.run('CREATE TABLE IF NOT EXISTS guilds (id TEXT, voice TEXT)');
    db.each("SELECT voice FROM guilds", async function(err, row) {
        if (row) {
            try {
                const voiceChannel = await client.channels.fetch(row.voice);
                if (!voiceChannel || !voiceChannel.joinable) return;
                return addInQueue(voiceChannel.guild.id, voiceChannel.id);
            } catch (e) {
                return db.run('DELETE FROM guilds WHERE voice = ?', [row.voice]);
            }
        }
    });
});

client.on('message', async (message) => {
    if (!message.guild.me.permissionsIn(message.channel.id).has('SEND_MESSAGES')) return;
    if (message.author.bot) return;

    if (message.content.includes(`<@${client.user.id}`) || message.content.includes(`<@!${client.user.id}>`)) return message.channel.send(`My prefix is \`${prefix}\`!\n-\`${prefix}invite\` => invite / soure code!\n-\`${prefix}start\` => start playing!`);

    if (!message.content.startsWith(prefix)) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/g);
    let command = args.shift().toLowerCase();

    if (['p', 's', 'start'].includes(command)) command = 'play';
    if (['i', 'link', 'links', 'support'].includes(command)) command = 'invite';

    if (command == 'play') {
        if (!message.member.voice) return message.channel.send('You need to be in a voice channel!');

        const channel = message.member.voice.channel;
        if (!channel || !channel.joinable) return message.channel.send('I can\'t join the voice channel!');
    
        const success = addInQueue(message.guild.id, channel.id);
        if (!success) return message.channel.send(success);
        else return message.channel.send('Started playing!');
    } else if (command == 'invite') {
        return message.channel.send(`Invite me using ${invite}\n\nMy github is https://github.com/RobinSchapendonk/discord-247-music-bot`);
    };
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.id !== client.user.id || !oldState.channel || newState.channel) return;
    return db.run('DELETE FROM guilds WHERE voice = ?', [oldState.channel.id]);
});

const shuffleArray = (array) => {
	for (let i = array.length - 1; i > 1; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

const addInQueue = async (guildID, channelID) => {
    const channel = await client.channels.fetch(channelID);
    if (!channel) return 'Invalid channel!';

    let queue = client.queues.get(guildID);

    if (queue && queue.voiceChannel.id !== channelID) {
        if (queue && queue.connection) queue.connection.removeAllListeners();

        const connection = await channel.join();
        queueConstruct.connection = connection;

        db.run('DELETE FROM guilds WHERE id = ?', [guildID]);
        db.run('INSERT INTO guilds VALUES (?,?)', [guildID, channelID]);

        return play(queueConstruct.songs[0]);
    }

    const files = readdirSync('./songs/');
    const mp3Files = files.filter(f => f.split('.').pop() === 'mp3');
    if (mp3Files.length == 0) return 'The songs folder is empty!';
    shuffleArray(mp3Files);

    mp3Files.forEach(async f => {
        queue = client.queues.get(guildID);
        const path = `./songs/${f}`;
        const file = path.split('/')[path.split('/').length - 1];
        const name = (file.split('.').splice(0, file.split('.').length - 1)).join('.');
        const songObj = {
            path,
            title: name,
        };

        if (!queue) {
            const queueConstruct = {
                voiceChannel: channel,
                connection: null,
                songs: [],
                volume: 2,
                playing: true,
                loop: false,
            };

            client.queues.set(guildID, queueConstruct);
            queueConstruct.songs.push(songObj);

            db.run('DELETE FROM guilds WHERE id = ?', [guildID]);
            db.run('INSERT INTO guilds VALUES (?,?)', [guildID, channelID]);

            const play = async song => {
                const queue = client.queues.get(guildID);
                if (!song) {
                    queue.voiceChannel.leave();
                    return client.queues.delete(guildID);
                }

                if (song.url) {
                    const dispatcher = queue.connection.play(ytdl(song.url))
                        .on('finish', () => {
                            queue.songs.shift();
                            if (queue.loop) queue.songs.push(song);
                            play(queue.songs[0]);
                        })
                        .on('error', error => console.error(error));
                    dispatcher.setVolumeLogarithmic(queue.volume / 5);
                } else {
                    const dispatcher = queue.connection.play(song.path)
                        .on('finish', () => {
                            queue.songs.shift();
                            if (queue.loop) queue.songs.push(song);
                            play(queue.songs[0]);
                        })
                        .on('error', error => console.error(error));
                    dispatcher.setVolumeLogarithmic(queue.volume / 5);
                }
            };

            try {
                const connection = await channel.join();
                queueConstruct.connection = connection;

                play(queueConstruct.songs[0]);
                return true;
            } catch (error) {
                await channel.leave();
                return client.queues.delete(guildID);
            }
        } else {
            queue.songs.push(songObj);
        }
    });
}

client.login(TOKEN);