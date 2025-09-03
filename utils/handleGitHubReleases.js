const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// MongoDB接続設定
const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
const mongoClient = new MongoClient(uri);

/**
 * 登録されているGitHubリポジトリの最新リリースを確認し、更新があれば通知します。
 * list APIで更新を確認後、detail APIで詳細を取得します。
 * @param {import('discord.js').Client} client Discordクライアント
 */
async function handleGitHubReleases(client) {
  console.log('GitHubリリースの更新をチェックします (manjubox.net API)...');
  try {
    await mongoClient.connect();
    const db = mongoClient.db('YMM4-Discord-Bot');
    const pluginsCollection = db.collection('watched_plugins');
    const settingsCollection = db.collection('settings');

    // 通知を送信するチャンネルIDを取得
    const allGuildSettings = await settingsCollection.find(
      { 'settings.pluginAnnounceChannel': { $exists: true, $ne: null } }
    ).toArray();
    const allChannelIds = allGuildSettings.map(guild => guild.settings.pluginAnnounceChannel);

    if (allChannelIds.length === 0) {
      console.log('通知先チャンネルが設定されていません。');
      return;
    }

    // Manjūbox APIから全プラグインの最新リリース情報を取得
    const listResponse = await fetch('https://manjubox.net/api/ymm4plugins/github/list');
    if (!listResponse.ok) {
      console.error(`[Manjūbox List API] データの取得に失敗: ${listResponse.statusText}`);
      return;
    }
    const allLatestReleases = await listResponse.json();

    // 各リリース情報を確認
    for (const releaseInfo of allLatestReleases) {
      if (releaseInfo.prerelease) {
        continue;
      }
      
      try {
        const dbRepoInfo = await pluginsCollection.findOne({ owner: releaseInfo.user, repo: releaseInfo.repo });
        if (!dbRepoInfo) {
          continue;
        }

        const apiPublishedAt = new Date(releaseInfo.published_at);
        const dbPublishedAt = dbRepoInfo.lastPublishedAt ? new Date(dbRepoInfo.lastPublishedAt) : null;

        // 新しいリリースがあり、DBの情報が古い場合に通知
        if (!dbPublishedAt || apiPublishedAt > dbPublishedAt) {
          console.log(`新しいリリースを発見: ${releaseInfo.user}/${releaseInfo.repo} - ${releaseInfo.name}`);

          // --- ▼ここから追加の処理 ---
          let releaseBody = null;
          try {
            // detail APIから詳細情報を取得
            const detailResponse = await fetch(`https://manjubox.net/api/ymm4plugins/github/detail/${releaseInfo.user}/${releaseInfo.repo}`);
            if (detailResponse.ok) {
              const detailInfo = await detailResponse.json();
              // APIは配列を返すため、最新のリリースである先頭の要素からbodyを取得
              if (detailInfo && detailInfo.length > 0 && detailInfo[0].body) {
                releaseBody = detailInfo[0].body;
              }
            } else {
              console.error(`[Manjūbox Detail API] ${releaseInfo.user}/${releaseInfo.repo} の詳細取得に失敗: ${detailResponse.statusText}`);
            }
          } catch (err) {
            console.error(`[Manjūbox Detail API] ${releaseInfo.user}/${releaseInfo.repo} の詳細取得中にエラーが発生:`, err);
          }
          // --- ▲ここまで追加の処理 ---

          const releaseUrl = `https://github.com/${releaseInfo.user}/${releaseInfo.repo}/releases/tag/${releaseInfo.tag_name}`;
          
          const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle(`更新: ${releaseInfo.repo} プラグイン`)
            .setDescription(`**[${releaseInfo.name || releaseInfo.tag_name}](${releaseUrl})** がリリースされました！`)
            .setTimestamp(apiPublishedAt);

          // 概要(リリースノート)があればEmbedに追加
          if (releaseBody) {
            // DiscordのEmbedの文字数制限(1024)を超えないように調整
            const bodyText = releaseBody.length > 1020
              ? `${releaseBody.substring(0, 1020)}...`
              : releaseBody;
            embed.addFields({ name: '概要', value: bodyText });
          }

          // ダウンロードリンクをフィールドに追加
          /*
          embed.addFields({ 
            name: '直接ダウンロード', 
            value: `[${releaseInfo.file_name}](${releaseInfo.browser_download_url})` 
          });
          */

          // 全ての登録チャンネルに通知を送信
          for (const channelId of allChannelIds) {
            try {
              const channel = await client.channels.fetch(channelId);
              if (channel) {
                await channel.send({ embeds: [embed] });
              }
            } catch (err) {
              console.error(`チャンネル(ID: ${channelId})への送信に失敗しました:`, err.message);
            }
          }

          // DBの公開日時を新しいものに更新
          await pluginsCollection.updateOne(
            { owner: releaseInfo.user, repo: releaseInfo.repo },
            { $set: { lastPublishedAt: releaseInfo.published_at } }
          );
        }
      } catch (error) {
        console.error(`リポジトリ ${releaseInfo.user}/${releaseInfo.repo} のチェック中にエラーが発生:`, error);
      }
    }
  } catch (error) {
    console.error('GitHubリリースのチェック処理全体でエラーが発生しました:', error);
  }
}

module.exports = { handleGitHubReleases };