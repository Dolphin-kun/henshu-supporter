const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('プラグイン検索')
    .setDescription('YMM4のプラグインを検索します')
    .addStringOption(option =>
      option.setName('キーワード')
        .setDescription('検索するキーワード')
        .setRequired(true)
    ),

  async execute(client, interaction) {
    const query = interaction.options.getString('キーワード');
    const res = await fetch(`https://ymme.ymm4-info.net/api/get?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const plugins = Object.values(data);

    if (plugins.length === 0) {
      return await interaction.reply({ content: 'プラグインが見つかりませんでした。', ephemeral: true });
    }

    let currentPage = 0;

    const getEmbed = (page) => {
      const plugin = plugins[page];
      return new EmbedBuilder()
        .setTitle(plugin.title ?? "タイトル不明")
        .setDescription(plugin.description || '説明なし')
        .addFields(
          { name: '作者', value: plugin.author || '不明', inline: true },
          { name: '日付', value: plugin.date?.split('T')[0] || '不明', inline: true },
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
        return i.reply({ content: 'このボタンはあなた専用です。', ephemeral: true });
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
