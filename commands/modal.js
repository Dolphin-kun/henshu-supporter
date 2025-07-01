const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const config = require("../config.json")

module.exports = {
	data: new SlashCommandBuilder()
		.setName('問い合わせ')
		.setDescription('運営のみが見ることのできる問い合わせ機能です'),
  
	async execute(client, interaction) {
    const modal = new ModalBuilder()
			.setCustomId('myModal')
			.setTitle('お問い合わせ');
    const title = new TextInputBuilder()
			.setCustomId('title')
			.setLabel("内容を入力してください")
			.setStyle(TextInputStyle.Short);

		const content = new TextInputBuilder()
			.setCustomId('content')
			.setLabel("詳細")
			.setStyle(TextInputStyle.Paragraph)
      .setMaxLength(2000);

		const firstActionRow = new ActionRowBuilder().addComponents(title);
		const secondActionRow = new ActionRowBuilder().addComponents(content);

		modal.addComponents(firstActionRow, secondActionRow);

		await interaction.showModal(modal);
    
    client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId === 'myModal') {
        const channel = interaction.guild.channels.cache.get(config.administratorChannel);
        const sendTitle = interaction.fields.getTextInputValue('title');
        const sendContent = interaction.fields.getTextInputValue('content');
        
        const embed1 = new EmbedBuilder()
          .setColor("Red")
          .setTitle("お問い合わせ")
          .setDescription(`**<@${interaction.user.id}>さんからお問い合わせです**\n以下お問い合わせ内容です\n\n**${sendTitle}**\n\`${sendContent}\``)
        channel.send({ embeds: [embed1]})
        
        const embed2 = new EmbedBuilder()
          .setColor("Green")
          .setDescription('**お問い合わせを受け付けました**')
        await interaction.reply({ embeds: [embed2], flags: MessageFlags.Ephemeral });
      }
    });
  }
};