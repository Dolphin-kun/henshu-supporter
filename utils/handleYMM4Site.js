const { MongoClient } = require("mongodb");
const { getMongoClient, getMongoUri } = require("./mongoClient");

async function handleYMM4Site(feed, discordClient, config) {
  const mongo = new MongoClient(getMongoUri());

  try {
    const mongo = await getMongoClient();
    const db = mongo.db("YMM4-Discord-Bot");
    const siteCollection = db.collection("ymm4info");

    const guild = discordClient.guilds.cache.get(config.guildId);
    const channel = guild?.channels.cache.get(config.YMM4SiteChannelId);

    for (const item of feed.items) {
      const existing = await siteCollection.findOne({ title: item.title });
      if (existing) continue;

      console.log(`${item.title} を追加しました`);
      await siteCollection.insertOne({ title: item.title, date: new Date() });

      if (channel) {
        await channel.send({ content: item.link });
      }
    }

  } catch (err) {
    console.error("YMM情報サイト処理中のMongoDBエラー:", err);
  } finally {
    await mongo.close();
  }
}

module.exports = { handleYMM4Site };
