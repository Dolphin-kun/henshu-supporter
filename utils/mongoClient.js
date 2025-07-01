const { MongoClient } = require("mongodb");

let client;

async function getMongoClient() {
  if (!client) {
    const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

module.exports = { getMongoClient };
