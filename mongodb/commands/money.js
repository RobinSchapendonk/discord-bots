module.exports.run = async (client, message, args, prefix, userDocument) => {
    const money = userDocument.money || 0;
    return message.channel.send(`You have $${money}!`);
};


exports.help = {
    name: 'money',
    category: 'Economy',
    description: 'Check your money',
    usage: 'money',
};