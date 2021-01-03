module.exports.run = async (client, message, args, prefix, userDocument) => {
    const lastWork = userDocument.lastWork || 0;
    if(Date.now() - lastWork < 5000) return message.channel.send(`You already have worked recently, please wait ${Math.round((Date.now() - lastWork) / 1000)} seconds`);

    const moneyToAdd = Math.floor((Math.random() * 500) + 1);

    if(userDocument.money >= Number.MAX_SAFE_INTEGER - moneyToAdd) return message.channel.send('You reached the max amount of money!');

    userDocument.money += moneyToAdd;
    userDocument.lastWork = Date.now();

    userDocument.save().then(async () => {
        await client.documents.set(message.member.id, userDocument);
        return message.channel.send(`You worked for $${moneyToAdd} and have now $${userDocument.money}!`);
    }).catch(err => {
        console.log('commands/work.js\n', err);
        return message.channel.send('Error when saving document!');
    })
};


exports.help = {
    name: 'work',
    category: 'Economy',
    description: 'Work for money',
    usage: 'work',
};