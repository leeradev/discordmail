// Get the required shit together
const Discord = require('eris');
const config = require('config');
const utils = require('./utils.js');
require('colors');

const client = new Discord.Client(config.get('api').discord.token);
const prefixes = config.get('discord').prefix.user.concat(config.get('discord').prefix.guild);
let prefix = null;

// Setup commands and util objects.
const commands = require('./cogs.js');

client.on('shardReady', (id) => {
	console.log(`Shard ${id} is online`.green);
});

client.on('ready', () => {
	// Set up regex for the bot.
	// It's "man's essential illness"
	// Use this regex for testing in regexr.com
	// /^(mss).?(ping)\s?([\s\S]*)/
	// /(\w+)rly/
	prefix = new RegExp(`^(${prefixes.join('|')}).?(${Object.keys(commands).join('|')})\\s?([\\s\\S]*)`, 'i');

	// Add mentions to the prefix list
	prefixes.push(`<@${client.user.id}>`);
	console.log('All shards are online'.green.bold);

	// Set up currently playing game
	client.editStatus('online', {
		name: 'dmail help',
		type: 0,
		url: 'https://discordmail.com/'
	});

	// Send DBOTS info if it was provided.
	if (config.get('api').botsdiscordpw) {
		utils.botsdiscordpw(client);
		setInterval(() => {
			utils.botsdiscordpw(client);
		}, 1800000);
	}

	// Send FAKEDBOTS info if it was provided.
	if (config.get('api').discordbotsorg) {
		utils.discordbotsorg(client);
		setInterval(() => {
			utils.discordbotsorg(client);
		}, 1800000);
	}

	// Check for bot collection servers
	utils.collection.check(client);
	setInterval(() => {
		utils.collection.check(client);
	}, 1800000);
});

client.on('messageCreate', (message) => {
	// It crashed on this before. No explaination.
	if (!message.author) return;
	// Disallow if the author is a bot
	if (message.author.bot) return;

	// Test the message content on the regular expression for prefixed commands.
	const pre = prefix.exec(message.content);

	// If there's a result, do this crap.
	if (pre) {
		message.prefix = pre[1];
		message.command = pre[2];
		message.input = pre[3] || null;
		message.name = message.author.username.replace(/ /g, '+')
			.replace(/\W/g, '=')
			.toLowerCase();
		message.context = config.get('discord').prefix.user.includes(message.prefix.toLowerCase()) ? 'user' : 'guild';
		message.inbox = message.context === 'user' ? message.author.id : (message.channel.guild && message.channel.guild.id) || 'Not inside a guild';
		// message.words = pre[3].split(/\n+|\s+/g);

		// Run the actual command
		commands[message.command].command(message, client);
	}
});

client.connect();
module.exports = client;
