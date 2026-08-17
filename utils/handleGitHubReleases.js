const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { getMongoUri } = require('./mongoClient');

const mongoClient = new MongoClient(getMongoUri());

const APP_STATE_COLLECTION = 'app_state';
const RELEASE_LIST_DOC_ID = 'latest_github_release_list';

/**
 * @param {import('discord.js').Client} client 
 */
async function handleGitHubReleases(client) {
  console.log('GitHubリリースの更新をチェックします (全プラグイン対象)...');
  try {
    await mongoClient.connect();
    const db = mongoClient.db('YMM4-Discord-Bot');
    const appStateCollection = db.collection(APP_STATE_COLLECTION);
    const settingsCollection = db.collection('settings');

    const allGuildSettings = await settingsCollection.find(
      { 'settings.pluginAnnounceChannel': { $exists: true, $ne: null } }
    ).toArray();
    const allChannelIds = allGuildSettings.map(guild => guild.settings.pluginAnnounceChannel);

    if (allChannelIds.length === 0) {
      console.log('通知先チャンネルが設定されていません。');
      return;
    }

    const listResponse = await fetch('https://manjubox.net/api/ymm4plugins/github/list');
    if (!listResponse.ok) {
      console.error(`[Manjūbox List API] データの取得に失敗: ${listResponse.statusText}`);
      return;
    }
    const currentList = await listResponse.json();

    const previousState = await appStateCollection.findOne({ _id: RELEASE_LIST_DOC_ID });
    const previousList = previousState ? previousState.data : [];

    if (previousList.length === 0) {
      console.log('初回チェックのため、現在のリリースリストをDBに保存します。');
      await appStateCollection.updateOne(
        { _id: RELEASE_LIST_DOC_ID },
        { $set: { data: currentList, updatedAt: new Date() } },
        { upsert: true }
      );
      return;
    }

    const updatedReleases = [];
    const previousMap = new Map(previousList.map(item => [`${item.user}/${item.repo}`, item]));

    for (const currentItem of currentList) {
      const repoKey = `${currentItem.user}/${currentItem.repo}`;
      
      if (currentItem.prerelease) {
        continue;
      }

      const previousItem = previousMap.get(repoKey);

      if (!previousItem || new Date(currentItem.published_at) > new Date(previousItem.published_at)) {
        console.log(`更新を検出: ${repoKey} - ${currentItem.name}`);
        updatedReleases.push(currentItem);
      }
    }
    
    if (updatedReleases.length > 0) {
      for (const releaseInfo of updatedReleases) {
        try {
          const detailResponse = await fetch(`https://manjubox.net/api/ymm4plugins/github/detail/${releaseInfo.user}/${releaseInfo.repo}`);
          let releaseBody = null;
          if (detailResponse.ok) {
            const detailInfo = await detailResponse.json();
            if (detailInfo && detailInfo.length > 0) {
              releaseBody = detailInfo[0].body;
            }
          }

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