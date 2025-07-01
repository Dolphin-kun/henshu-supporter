const { Events, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config.json')

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
    if(!interaction.isStringSelectMenu()) return;
    if(interaction.customId!=="welcomeQ") return;
    
    const channel = interaction.guild.channels.cache.get(config.administratorChannelId);
    
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle(`アンケートの回答`)
      .setDescription(`回答者：<@${interaction.user.id}>\n-------回答-------`)
      .setFields({ name: "このサーバーをどこで知りましたか", value:`- ${interaction.values[0]}`})
    
    channel.send({ content: `<@${interaction.user.id}>`,embeds: [embed] })
    
    interaction.reply({content:"アンケートへのご回答ありがとうございます！", flags: MessageFlags.Ephemeral})
	},
}