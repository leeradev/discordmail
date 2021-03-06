const config = require('config');
const mailgun = require('mailgun-js')(config.get('api').mailgun);
const request = require('request');
const dmail = require('./../../utils.js').dmail;
const r = require('./../../../db');
const isadmin = require('./../../utils.js').isadmin;

const regex = /(\w{8}-\w{4}-\w{4}-\w{4}-\w{12}) *([\w\W]+)/;

module.exports.info = {
	name: 'Reply to E-Mail',
	category: 'mail',
	aliases: [
		'reply'
	]
};

module.exports.command = (message) => {
	const email = regex.exec(message.input);

	if (message.context === 'guild' && !message.channel.guild) {
		message.channel.createMessage('You can only use this context within a guild!');
	} else if (message.context === 'guild' && !isadmin(message.member)) {
		message.channel.createMessage('Only administrators can control the guild\'s dmail!');
	} else {
		// Check for registrations
		dmail.check(message.inbox)
			.then((details) => {
				if (!email) {
					message.channel.createMessage(`Invalid use of command. Expected input: \`dmail ${message.command} Reply-ID content\``);
				} else {
					r.table('replies')
						.get(email[1])
						.run(r.conn, (err, res) => {
							if (err) {
								message.channel.createMessage(`An error occured looking up your reply: ${err.message}`);
							} else if (!res) {
								message.channel.createMessage('Could not find your Reply-ID');
							} else if (res.to !== `${details.email}`) {
								message.channel.createMessage('You are not allowed to reply with other user\'s IDs');
							} else {
								const data = {
									from: `${details.display} <${details.email}@discordmail.com>`,
									to: res.from,
									'h:In-Reply-To': res.reply,
									'h:References': res.reference,
									subject: res.subject,
									text: email[2] + config.get('footer')
								};

								if (message.attachments && message.attachments[0]) {
									data.attachment = request(message.attachments[0].url);
								}

								mailgun.messages().send(data, (err2) => {
									if (err2) {
										message.channel.createMessage(`Failed to send E-Mail: ${err2.message}`);
										console.log(`Failed to send an email from ${details.email}`);
									} else {
										message.channel.createMessage('Successfully sent E-Mail.');
										console.log(`Sent an email by ${details.email}`);
									}
								});
							}
						});
				}
			})
			.catch((err) => {
				message.channel.createMessage(err);
			});
	}
};
