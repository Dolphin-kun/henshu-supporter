const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

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

    modal.addComponents(
      new ActionRowBuilder().addComponents(title),
      new ActionRowBuilder().addComponents(content)
    );

    await interaction.showModal(modal);
  }
};
