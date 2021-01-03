module.exports.run = async (client, message, args, prefix, stats) => {
    const { level, experience } = stats;
    const experienceNeeded = client.experienceNeededForNextLevel(level);
    return message.channel.send(`You\'re level ${level} and have ${experience} xp! You need ${experienceNeeded - experience} more xp for the next level!`);
};


exports.help = {
    name: 'level',
    category: 'Leveling',
    description: 'Check your level',
    usage: 'level',
};