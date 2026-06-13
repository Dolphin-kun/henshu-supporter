const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('エフェクト検索')
    .setDescription('YMM4のエフェクトを検索します')
    .addStringOption(option =>
      option.setName('キーワード')
        .setDescription('検索するキーワード')
        .setRequired(true)
    ),

  async execute(client, interaction) {
    const query = interaction.options.getString('キーワード');
    const res = await fetch('https://ymm4-info.net/api/ymm4/effects');
    const data = await res.json();
    const allEffects = data.effects || [];
    const plugins = allEffects.filter(effect => 
      (effect.displayName && effect.displayName.includes(query)) || 
      (effect.className && effect.className.includes(query)) ||
      (effect.category && effect.category.includes(query))
    );

    if (plugins.length === 0) {
      return await interaction.reply({ content: 'エフェクト/プラグインが見つかりませんでした。', flags: MessageFlags.Ephemeral });
    }

    let currentPage = 0;

    const getEmbed = (page) => {
      const plugin = plugins[page];
      
      const kindMap = {
        video: "映像エフェクト",
        audio: "音声エフェクト"
      };
      const kindName = kindMap[plugin.kind] || plugin.kind || "不明";
      const docUrl = `https://ymm4-info.net/doc/effects/${encodeURIComponent(kindName)}/${encodeURIComponent(plugin.category || '')}/${encodeURIComponent(plugin.displayName || '')}`;

      return new EmbedBuilder()
        .setTitle(plugin.displayName ?? "名前不明")
        .setURL(docUrl)
        .setDescription(`[YMM4情報サイトで詳細を確認する](${docUrl})`)
        .addFields(
          { name: 'カテゴリ', value: plugin.category || '不明', inline: true }
        )
        .setFooter({ text: `ページ ${page + 1} / ${plugins.length}` });
    };

    const getButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('◀ 前へ')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('次へ ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === plugins.length - 1),
      );
    };

    await interaction.reply({
      embeds: [getEmbed(currentPage)],
      components: [getButtons(currentPage)]
    });
    
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'このボタンはあなた専用です。', flags: MessageFlags.Ephemeral });
      }

      if (i.customId === 'prev' && currentPage > 0) currentPage--;
      if (i.customId === 'next' && currentPage < plugins.length - 1) currentPage++;

      await i.update({
        embeds: [getEmbed(currentPage)],
        components: [getButtons(currentPage)],
      });
    });

    collector.on('end', async () => {
      if (message.editable) {
        await message.edit({ components: [] });
      }
    });
  },
};
