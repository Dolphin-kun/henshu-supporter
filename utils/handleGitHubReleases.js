const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// MongoDB接続設定
const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
const mongoClient = new MongoClient(uri);

const APP_STATE_COLLECTION = 'app_state';
const RELEASE_LIST_DOC_ID = 'latest_github_release_list';

/**
 * 登録されているGitHubリポジトリの最新リリースを確認し、更新があれば通知します。
 * list APIで更新を確認後、detail APIで詳細を取得します。
 * @param {import('discord.js').Client} client Discordクライアント
 */
async function handleGitHubReleases(client) {
  console.log('GitHubリリースの更新をチェックします (全プラグイン対象)...');
  try {
    await mongoClient.connect();
    const db = mongoClient.db('YMM4-Discord-Bot');
    const appStateCollection = db.collection(APP_STATE_COLLECTION);
    const settingsCollection = db.collection('settings');
    // ▼削除: 'watched_plugins'コレクションの参照を削除
    // const pluginsCollection = db.collection('watched_plugins'); 

    // --- 1. 通知先のチャンネルを取得 ---
    const allGuildSettings = await settingsCollection.find(
      { 'settings.pluginAnnounceChannel': { $exists: true, $ne: null } }
    ).toArray();
    const allChannelIds = allGuildSettings.map(guild => guild.settings.pluginAnnounceChannel);

    if (allChannelIds.length === 0) {
      console.log('通知先チャンネルが設定されていません。');
      return;
    }

    // --- 2. 現在のリリースリストをAPIから取得 ---
    const listResponse = await fetch('https://manjubox.net/api/ymm4plugins/github/list');
    if (!listResponse.ok) {
      console.error(`[Manjūbox List API] データの取得に失敗: ${listResponse.statusText}`);
      return;
    }
    const currentList = await listResponse.json();

    // --- 3. 前回保存したリリースリストをDBから取得 ---
    const previousState = await appStateCollection.findOne({ _id: RELEASE_LIST_DOC_ID });
    const previousList = previousState ? previousState.data : [];

    // --- 4. 初回実行時の処理 ---
    if (previousList.length === 0) {
      console.log('初回チェックのため、現在のリリースリストをDBに保存します。');
      await appStateCollection.updateOne(
        { _id: RELEASE_LIST_DOC_ID },
        { $set: { data: currentList, updatedAt: new Date() } },
        { upsert: true }
      );
      return;
    }

    // --- 5. 前回と今回のリストを比較して、更新があったものを探す ---
    const updatedReleases = [];
    const previousMap = new Map(previousList.map(item => [`${item.user}/${item.repo}`, item]));

    // ▼削除: 'watched_plugins'から監視リストを作成する処理を削除
    // const watchedPlugins = await pluginsCollection.find({}).toArray();
    // const watchedSet = new Set(watchedPlugins.map(p => `${p.owner}/${p.repo}`));

    for (const currentItem of currentList) {
      const repoKey = `${currentItem.user}/${currentItem.repo}`;
      
      // ▼変更: プレリリースかどうかのみをチェックするように条件を単純化
      if (currentItem.prerelease) {
        continue;
      }

      const previousItem = previousMap.get(repoKey);

      // 新規追加された、または公開日時が新しいリリースを更新対象とする
      if (!previousItem || new Date(currentItem.published_at) > new Date(previousItem.published_at)) {
        console.log(`更新を検出: ${repoKey} - ${currentItem.name}`);
        updatedReleases.push(currentItem);
      }
    }
    
    // --- 6. 更新があったリリースを通知 ---
    if (updatedReleases.length > 0) {
      for (const releaseInfo of updatedReleases) {
        try {
          // 詳細情報を取得 (リリースノート本文など)
          const detailResponse = await fetch(`https://manjubox.net/api/ymm4plugins/github/detail/${releaseInfo.user}/${releaseInfo.repo}`);
          let releaseBody = null;
          if (detailResponse.ok) {
            const detailInfo = await detailResponse.json();
            if (detailInfo && detailInfo.length > 0) {
              releaseBody = detailInfo[0].body;
            }
          }

          // Embedを作成
          const releaseUrl = `https://github.com/${releaseInfo.user}/${releaseInfo.repo}/releases/tag/${releaseInfo.tag_name}`;
          const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle(`更新: ${releaseInfo.repo} プラグイン`)
            .setDescription(`**[${releaseInfo.name || releaseInfo.tag_name}](${releaseUrl})** がリリースされました！`)
            .setTimestamp(new Date(releaseInfo.published_at));

          if (releaseBody) {
            const bodyText = releaseBody.length > 1020 ? `${releaseBody.substring(0, 1020)}...` : releaseBody;
            embed.addFields({ name: '概要', value: bodyText });
          }

          // 全ての登録チャンネルに通知を送信
          for (const channelId of allChannelIds) {
            try {
              const channel = await client.channels.fetch(channelId);
              if (channel) {
                await channel.send({ embeds: [embed] });
              }
            } catch (err) {
              console.error(`チャンネル(ID: ${channelId})への送信に失敗:`, err.message);
            }
          }
        } catch (err) {
          console.error(`リリース ${releaseInfo.user}/${releaseInfo.repo} の通知処理中にエラー:`, err);
        }
      }

      // --- 7. 全ての通知が終わったら、DBのリストを最新の状態に更新 ---
      console.log('通知が完了したため、DBのリリースリストを更新します。');
      await appStateCollection.updateOne(
        { _id: RELEASE_LIST_DOC_ID },
        { $set: { data: currentList, updatedAt: new Date() } },
        { upsert: true }
      );

    } else {
      console.log('リリースに更新はありませんでした。');
    }

  } catch (error) {
    console.error('GitHubリリースのチェック処理全体でエラーが発生しました:', error);
  }
}

module.exports = { handleGitHubReleases };