const { Events, ActivityType } = require("discord.js");
const Parser = require("rss-parser");
const parser = new Parser();
const config = require("../config.json");
const { handleManjuBox } = require("../utils/handleManjuBox");
const { handleYMM4Site } = require("../utils/handleYMM4Site");
const { handleGitHubReleases } = require("../utils/handleGitHubReleases");

const { MongoClient } = require('mongodb');
const { getMongoUri } = require('../utils/mongoClient');
const mongoClient = new MongoClient(getMongoUri());

const safeParseFeed = async (url, label) => {
	try {
		return await parser.parseURL(url);
	} catch (error) {
		console.warn(`[RSS] ${label} の取得に失敗しました: ${error.message}`);
		return null;
	}
};

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
			try {
				const memberCount = client.guilds.cache.get(config.guildId)?.memberCount ?? 0;
				client.user.setActivity({
					name: `${memberCount}人がサーバーでYMM4を堪能中`,
					type: ActivityType.Custom,
				});

				const feedYMMSite = await safeParseFeed("https://ymm4-info.net/rss.xml", "YMM4 Info");
				const feedManjuBox = await safeParseFeed("https://manjubox.net/rss.xml", "ManjuBox");

				if (feedYMMSite) await handleYMM4Site(feedYMMSite, client, config);
				if (feedManjuBox) await handleManjuBox(feedManjuBox, client, config);
			} catch (error) {
				console.error("RSS定期チェック中にエラーが発生しました:", error);
			}
		}, 60000);

		// GitHubリリースのチェック（APIレート制限を避けるため、間隔を長く設定）
		setInterval(async () => {
			await handleGitHubReleases(client);
		}, 10 * 60 * 1000); // 10分ごと (10 * 60秒 * 1000ミリ秒)
		await handleGitHubReleases(client);
	}
};
