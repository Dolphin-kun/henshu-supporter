const { EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, Events, MessageFlags } = require('discord.js');
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

    const res = await fetch('https://ymm4-info.net/api/ymm4/effects');
    const data = await res.json();
    const allEffects = data.effects || [];
    const plugins = allEffects.filter(effect => 
      (effect.displayName && effect.displayName.includes(query)) || 
      (effect.className && effect.className.includes(query)) ||
      (effect.category && effect.category.includes(query))
    );

    if (!plugins[newPage]) return interaction.reply({ content: '⚠️ ページが存在しません。', flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setTitle(plugins[newPage].displayName ?? "名前不明")
      .setDescription(`クラス名: \`${plugins[newPage].className || '不明'}\`\n種類: ${plugins[newPage].kind || '不明'}`)
      .addFields(
        { name: "カテゴリ", value: plugins[newPage].category || "不明", inline: true }
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
