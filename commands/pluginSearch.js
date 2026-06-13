const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
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
    const query = interaction.options.getString('キーワード').toLowerCase();
    
    await interaction.deferReply();

    let listData = [];
    try {
      const res = await fetch('https://manjubox.net/api/ymm4plugins/github/list');
      listData = await res.json();
    } catch (e) {
      return await interaction.editReply({ content: 'プラグイン一覧の取得に失敗しました。' });
    }

    const plugins = listData.filter(plugin => 
      (plugin.repo && plugin.repo.toLowerCase().includes(query)) ||
      (plugin.user && plugin.user.toLowerCase().includes(query))
    );

    if (plugins.length === 0) {
      return await interaction.editReply({ content: 'プラグインが見つかりませんでした。' });
    }

    let currentPage = 0;

    const getEmbed = async (page) => {
      const plugin = plugins[page];
      const repoUrl = `https://github.com/${plugin.user}/${plugin.repo}`;
      
      let description = '説明なし';
      try {
        const detailRes = await fetch(`https://manjubox.net/api/ymm4plugins/github/detail/${plugin.user}/${plugin.repo}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData && detailData.length > 0 && detailData[0].body) {
            description = detailData[0].body;
            if (description.length > 500) {
              description = description.substring(0, 500) + '...';
            }
          }
        }
      } catch (e) {
        console.error(e);
      }

      return new EmbedBuilder()
        .setTitle(plugin.repo ?? "名前不明")
        .setURL(repoUrl)
        .setDescription(description || '説明なし')
        .addFields(
          { name: '作者', value: plugin.user || '不明', inline: true },
          { name: 'バージョン', value: plugin.tag_name || '不明', inline: true },
          { name: '更新日', value: plugin.published_at ? new Date(plugin.published_at).toLocaleDateString("ja-JP") : '不明', inline: true },
          { name: 'ダウンロード', value: `[ダウンロード](${plugin.browser_download_url})`, inline: false }
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

    const embed = await getEmbed(currentPage);
    await interaction.editReply({
      embeds: [embed],
      components: [getButtons(currentPage)]
    });
    
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'このボタンはあなた専用です。', flags: MessageFlags.Ephemeral });
      }

      await i.deferUpdate();

      if (i.customId === 'prev' && currentPage > 0) currentPage--;
      if (i.customId === 'next' && currentPage < plugins.length - 1) currentPage++;

      const updatedEmbed = await getEmbed(currentPage);
      await i.editReply({
        embeds: [updatedEmbed],
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
