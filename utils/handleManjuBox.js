const { getMongoClient } = require("./mongoClient");

async function handleManjuBox(feed, discordClient, config) {
  try {
    const mongo = await getMongoClient();
    const db = mongo.db("YMM4-Discord-Bot");
    const rssCollection = db.collection("rss");
    const guildsCollection = db.collection("settings");

    for (const item of feed.items) {
      if (item.title === "No title") continue;

      const existing = await rssCollection.findOne({ title: item.title });
      if (existing) continue;

      console.log(`${item.title} を追加しました`);
      await rssCollection.insertOne({ title: item.title, date: new Date() });

      const embed = {
        color: 0x7CFC00,
        title: item.title,
        url: item.link,
        description: item.content,
        timestamp: new Date().toISOString()
      };

      const dbGuilds = await guildsCollection.find().toArray();

      for (const guildData of dbGuilds) {
        const guildId = guildData.guildId;
        if (!guildId) {
          console.warn("⚠️ guildId が存在しません:", guildData);
          continue;
        }

        const setting = guildData.settings;
        if (!setting || !setting.manjuSummonerChannel) {
          console.warn(`⚠️ ギルド ${guildId} に manjuSummonerChannel が設定されていません`);
          continue;
        }

        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) {
          console.warn(`⚠️ discordClient.guilds.cache に guildId: ${guildId} が見つかりません`);
          continue;
        }

        const channel = guild.channels.cache.get(setting.manjuSummonerChannel);
        if (!channel) {
          console.warn(`⚠️ チャンネル ${setting.manjuSummonerChannel} がギルド ${guildId} に見つかりません`);
          continue;
        }

        console.log(`📨 ${guild.name}（${guildId}）の ${channel.name} に送信中...`);

        // content は config.manjuBoxChannelId のときのみ付与
        const messagePayload = {
          embeds: [embed],
        };

        if (setting.manjuSummonerChannel === config.manjuBoxChannelId) {
          messagePayload.content = "<@&1233086532815028267>";
        }

        try {
          await channel.send(messagePayload);
        } catch (sendErr) {
          console.error(`❌ チャンネル ${channel.id} への送信失敗:`, sendErr);
        }
      }
    }
  } catch (err) {
    console.error("MongoDBエラー:", err);
  }
}

module.exports = { handleManjuBox };
