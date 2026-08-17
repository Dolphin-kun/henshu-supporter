const { MongoClient } = require("mongodb");

let client;

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.Mongo || `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
}

async function getMongoClient() {
  if (!client) {
    const uri = getMongoUri();
    if (!uri) {
      throw new Error('MongoDB URI is not configured. Set MONGODB_URI in environment variables.');
    }
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

module.exports = { getMongoClient, getMongoUri };
