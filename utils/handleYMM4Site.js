const { MongoClient } = require("mongodb");
const { getMongoClient } = require("./mongoClient");

async function handleYMM4Site(feed, discordClient, config) {
  const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
  const mongo = new MongoClient(uri);

  try {
    const mongo = await getMongoClient();
    const db = mongo.db("YMM4-Discord-Bot");
    const siteCollection = db.collection("ymm4info");

    const guild = discordClient.guilds.cache.get(config.guildId); // ← config.guildId などに置換可
    const channel = guild?.channels.cache.get(config.YMM4SiteChannelId); // 情報サイト通知用チャンネルID

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
