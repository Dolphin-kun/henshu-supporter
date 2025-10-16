const { Events, ActivityType } = require("discord.js");
const Parser = require("rss-parser");
const parser = new Parser();
const config = require("../config.json");
const { handleManjuBox } = require("../utils/handleManjuBox");
const { handleYMM4Site } = require("../utils/handleYMM4Site");
const { handleGitHubReleases } = require("../utils/handleGitHubReleases");

const { MongoClient } = require('mongodb');
const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
const mongoClient = new MongoClient(uri);

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`${client.user.tag}がオンラインになりました`);
		console.log("----------参加サーバー----------")
		console.log(client.guilds.cache.map(guild => `${guild.name} || ${guild.memberCount}人 || ID:${guild.id}`).join("\n"))
		console.log("------------------------------")

		// MongoDB接続
		try {
			await mongoClient.connect();
			console.log("MongoDBに接続しました");
		} catch (error) {
			console.error("MongoDBの接続に失敗しました:", error);
		}

		setInterval(async () => {
			const memberCount = client.guilds.cache.get(config.guildId)?.memberCount ?? 0;
			client.user.setActivity({
				name: `${memberCount}人がサーバーでYMM4を堪能中`,
				type: ActivityType.Custom,
			});

			const feedYMMSite = await parser.parseURL("https://ymm4-info.net/rss.xml");
			const feedManjuBox = await parser.parseURL("https://manjubox.net/rss.xml");

			await handleYMM4Site(feedYMMSite, client, config);
			await handleManjuBox(feedManjuBox, client, config);
		}, 60000);

		// GitHubリリースのチェック（APIレート制限を避けるため、間隔を長く設定）
		setInterval(async () => {
			await handleGitHubReleases(client);
		}, 10 * 60 * 1000); // 10分ごと (10 * 60秒 * 1000ミリ秒)
		await handleGitHubReleases(client);
	}
};
