const { Events, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== 'myModal') return;

    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({
        content: 'この操作はサーバー内でのみ使用できます。',
        ephemeral: true
      });
    }

    const channel = guild.channels.cache.get(config.administratorChannelId);
    if (!channel) {
      return interaction.reply({
        content: '管理者チャンネルが見つかりません。',
        ephemeral: true
      });
    }

    const sendTitle = interaction.fields.getTextInputValue('title');
    const sendContent = interaction.fields.getTextInputValue('content');

    const embed1 = new EmbedBuilder()
      .setColor("Red")
      .setTitle("お問い合わせ")
      .setDescription(`**<@${interaction.user.id}>さんからのお問い合わせ**\n\n**${sendTitle}**\n\`${sendContent}\``);

    await channel.send({ embeds: [embed1] });

    const embed2 = new EmbedBuilder()
      .setColor("Green")
      .setDescription('**お問い合わせを受け付けました**');

    await interaction.reply({ embeds: [embed2], flags: MessageFlags.Ephemeral });
  }
};
