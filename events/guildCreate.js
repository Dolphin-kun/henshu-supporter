const { Events } = require("discord.js");
const { MongoClient } = require("mongodb");

const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

module.exports = {
  name:Events.GuildCreate,
  /**
   * @param {Guild} guild
   */
  async execute(guild){
    const config = require("../guild-config.json");
    config.guildId = guild.id;

    try{
      await client.connect();

      const database = client.db("YMM4-Discord-Bot");
      const collection = database.collection("settings");

      await collection.updateOne(
        { guildId: guild.id },
        { $set: config },
        { upsert: true }
      );

      console.log(`Guild ${guild.name} の設定をデータベースに保存しました。`);
    }catch (error) {
      console.error("データベースへの保存中にエラーが発生しました:", error);
    }finally {
      await client.close();
    }
  }
}
