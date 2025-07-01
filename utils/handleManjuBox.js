const { MongoClient } = require("mongodb");

async function handleManjuBox(feed, discordClient, config) {
  const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
  const mongo = new MongoClient(uri);

  try {
    await mongo.connect();
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
          console.warn("guildId が存在しません:", guildData);
          continue;
        }

        const setting = guildData.settings;
        if (!setting || !setting.manjuSummonerChannel) continue;

        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(setting.manjuSummonerChannel);
        if (!channel) continue;

        const content = (setting.manjuSummonerChannel === config.manjuBoxChannelId)
          ? "test"
          : undefined;

        await channel.send({ content, embeds: [embed] });
      }
    }
  } catch (err) {
    console.error("MongoDBエラー:", err);
  } finally {
    await mongo.close();
  }
}

module.exports = { handleManjuBox };
