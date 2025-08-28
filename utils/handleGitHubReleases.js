const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// MongoDB接続設定
const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
const mongoClient = new MongoClient(uri);

/**
 * 登録されているGitHubリポジトリの最新リリースを確認し、更新があれば通知します。
 * @param {import('discord.js').Client} client Discordクライアント
 */
async function handleGitHubReleases(client) {
  console.log('GitHubリリースの更新をチェックします...');
  try {
    await mongoClient.connect();
    const db = mongoClient.db('YMM4-Discord-Bot');
    const pluginsCollection = db.collection('watched_plugins');
    const settingsCollection = db.collection('settings');

    const reposToWatch = await pluginsCollection.find({}).toArray();

    const allGuildSettings = await settingsCollection.find(
      { 'settings.pluginAnnounceChannel': { $exists: true, $ne: null } }
    ).toArray();
    const allChannelIds = allGuildSettings.map(guild => guild.settings.pluginAnnounceChannel);

    if (allChannelIds.length === 0) return;

    for (const repoInfo of reposToWatch) {
      const { owner, repo, lastReleaseId } = repoInfo;
      try {
        const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases/latest`, {
          headers: { "user-agent": "YMM4Info-DiscordBot" }
        });

        if (!response.ok) {
          console.error(`[GitHub API] ${repoInfo.owner}/${repoInfo.repo} の取得に失敗: ${response.statusText}`);
          continue;
        }

        const latestRelease = await response.json();

        // 新しいリリースがあり、かつDBに保存されたIDと異なる場合に通知
        if (latestRelease.id && latestRelease.id !== repoInfo.lastReleaseId) {
          console.log(`新しいリリースを発見: ${repoInfo.owner}/${repoInfo.repo} - ${latestRelease.name}`);

          const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle(`新しいリリース: ${repoInfo.repo} プラグイン`)
            .setDescription(`**[${latestRelease.name || latestRelease.tag_name}](${latestRelease.html_url})** がリリースされました！`)
            .setTimestamp(new Date(latestRelease.published_at));

          if (latestRelease.body) {
            // 1024文字を超えないように本文を整形
            const bodyText = latestRelease.body.length > 1020
              ? `${latestRelease.body.substring(0, 1020)}...`
              : latestRelease.body;

            embed.addFields({ name: '概要', value: bodyText });
          }

          for (const channelId of allChannelIds) {
            try {
              const channel = await client.channels.fetch(channelId);
              if (channel) {
                // contentは不要な場合が多いため削除し、Embedのみ送信します。
                await channel.send({ embeds: [embed] });
              }
            } catch (err) {
              console.error(`チャンネル(ID: ${channelId})への送信に失敗しました:`, err.message);
            }
          }

          // DBのリリースIDを新しいものに更新
          await pluginsCollection.updateOne(
            { owner, repo },
            { $set: { lastReleaseId: latestRelease.id } }
          );
        }
      } catch (error) {
        console.error(`リポジトリ ${repoInfo.owner}/${repoInfo.repo} のチェック中にエラーが発生:`, error);
      }
    }
  } catch (error) {
    console.error('GitHubリリースのチェック処理全体でエラーが発生しました:', error);
  }
}

module.exports = { handleGitHubReleases };