// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args, prefix, embed) => {
	const ErrorID = args[0];
	if(!ErrorID) return message.channel.send('You need to specify the errorID!');


	let errors = await client.db.general.get('errors');
	if(!errors) errors = [];

	const error = errors[parseInt(ErrorID)];
	if(!error) return message.channel.send('That\'s an invalid errorID!');

	return message.channel.send(`Name: ${error.name}, message: ${error.message}`);
};


exports.help = {
	name: 'errorinfo',
	category: 'General',
	description: 'Get info about an error',
	usage: 'errorinfo <ErrorID>',
};