const { EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, Events } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;
    const [action, direction, pageStr] = interaction.customId.split('_');
    if (action !== 'plugin') return;

    const oldPage = parseInt(pageStr);
    const newPage = direction === 'next' ? oldPage + 1 : oldPage - 1;

    const message = await interaction.message.fetch();
    const query = message.embeds[0]?.title || null;
    if (!query) return;

    const res = await fetch(`https://ymme.ymm4-info.net/api/get?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const plugins = Object.values(data);

    if (!plugins[newPage]) return interaction.reply({ content: '⚠️ ページが存在しません。', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle(plugins[newPage].title)
      .setDescription(plugins[newPage].description || "説明なし")
      .addFields(
        { name: "作者", value: plugins[newPage].author || "不明", inline: true },
        { name: "公開日", value: new Date(plugins[newPage].date).toLocaleDateString("ja-JP"), inline: true }
      )
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`plugin_prev_${newPage}`)
        .setLabel('← 前へ')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(newPage === 0),
      new ButtonBuilder()
        .setCustomId(`plugin_next_${newPage}`)
        .setLabel('次へ →')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(newPage >= plugins.length - 1)
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }
};
