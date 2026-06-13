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
    let yamlMap = {};
    try {
      const res = await fetch('https://manjubox.net/api/ymm4plugins/github/list');
      listData = await res.json();
      
      const yamlRes = await fetch('https://manjubox.net/ymm4plugins.yml');
      const yamlText = await yamlRes.text();
      
      const yamlPlugins = [];
      let currentPlugin = null;
      for (const line of yamlText.split('\n')) {
        const trimmed = line.trim();
        if (line.startsWith('- ')) {
          currentPlugin = {};
          yamlPlugins.push(currentPlugin);
          const keyVal = line.substring(2).split(':');
          if (keyVal.length >= 2) {
            currentPlugin[keyVal[0].trim()] = keyVal.slice(1).join(':').trim();
          }
        } else if (line.startsWith('  ') && !line.startsWith('  -')) {
          if (currentPlugin) {
            const keyVal = trimmed.split(':');
            if (keyVal.length >= 2) {
              currentPlugin[keyVal[0].trim()] = keyVal.slice(1).join(':').trim();
            }
          }
        }
      }

      for (const yp of yamlPlugins) {
        if (yp.url) {
          let normalizedUrl = yp.url.replace(/\/$/, '').toLowerCase();
          yamlMap[normalizedUrl] = yp;
        }
      }
    } catch (e) {
      return await interaction.editReply({ content: 'プラグイン一覧の取得に失敗しました。' });
    }

    for (const plugin of listData) {
      const githubUrl = `https://github.com/${plugin.user}/${plugin.repo}`.toLowerCase();
      const yp = yamlMap[githubUrl];
      if (yp) {
        plugin.yamlName = yp.name;
        plugin.yamlDesc = yp.description;
      }
    }

    const plugins = listData.filter(plugin => 
      (plugin.repo && plugin.repo.toLowerCase().includes(query)) ||
      (plugin.user && plugin.user.toLowerCase().includes(query)) ||
      (plugin.yamlName && plugin.yamlName.toLowerCase().includes(query)) ||
      (plugin.yamlDesc && plugin.yamlDesc.toLowerCase().includes(query))
    );

    if (plugins.length === 0) {
      return await interaction.editReply({ content: 'プラグインが見つかりませんでした。' });
    }

    let currentPage = 0;

    const getEmbed = async (page) => {
      const plugin = plugins[page];
      const repoUrl = `https://github.com/${plugin.user}/${plugin.repo}`;
      
      let description = plugin.yamlDesc || '説明なし';
      try {
        const detailRes = await fetch(`https://manjubox.net/api/ymm4plugins/github/detail/${plugin.user}/${plugin.repo}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData && detailData.length > 0 && detailData[0].body) {
            description = description !== '説明なし' 
              ? `${description}\n\n**リリースノート:**\n${detailData[0].body}`
              : detailData[0].body;
            if (description.length > 500) {
              description = description.substring(0, 500) + '...';
            }
          }
        }
      } catch (e) {
        console.error(e);
      }

      return new EmbedBuilder()
        .setTitle(plugin.yamlName ? `${plugin.yamlName} (${plugin.repo})` : plugin.repo)
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
