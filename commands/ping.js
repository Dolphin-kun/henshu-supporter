const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Ping値を計測します'),

	async execute(client, interaction) {
		await interaction.reply({ content: `計算中`, flags: MessageFlags.Ephemeral });
		await interaction.editReply({ content: `Pong! APIレイテンシ : ${Math.round(client.ws.ping)}ms 🛰️`, flags: MessageFlags.Ephemeral });
	},
};
