const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { MongoClient } = require('mongodb');

// MongoDBの接続設定
const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

async function getGuildSettings(guildId) {
  await client.connect();
  const db = client.db('YMM4-Discord-Bot');
  const collection = db.collection('settings');
  const settings = await collection.findOne({ guildId });
  return settings;
}

async function updateGuildSettings(guildId, newSettings) {
  await client.connect();
  const db = client.db('YMM4-Discord-Bot');
  const collection = db.collection('settings');
  await collection.updateOne(
    { guildId },
    { $set: newSettings },
    { upsert: true }
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('サーバー設定')
    .setDescription('設定を変更します[サーバー管理者のみ設定可能]')
    .addSubcommand(subcommand =>
      subcommand
        .setName('設定の確認')
        .setDescription('現在設定されているデータを確認します'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('饅頭遣いのおもちゃ箱')
        .setDescription('饅頭遣いのおもちゃ箱の最新情報を共有するチャンネルを変更します')
        .addChannelOption(option =>
          option.setName('manju_summoner_channel')
            .setDescription('チャンネルを指定してください')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  firstPage: false,

  /**
   * 
   * @param {*} client 
   * @param {import('discord.js').Interaction} interaction 
   */
  async execute(client, interaction) {
    const guildId = interaction.guildId;
    const defaultConfig = require('../guild-config.json');

    let dbData = await getGuildSettings(guildId);

    // 初期設定が存在しない場合
    if (!dbData) {
      // 初期設定作成
      const newConfig = {
        guildId: guildId,
        settings: {
          manjuSummonerChannel: null,
        },
      };
      await updateGuildSettings(guildId, newConfig);
      dbData = newConfig;
    }

    if (interaction.options.getSubcommand() === "設定の確認") {
      const manjuSummonerChannelId = dbData.settings.manjuSummonerChannel
        ? `<#${dbData.settings.manjuSummonerChannel}>`
        : "設定されていません";

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("サーバー設定")
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setDescription("1ページ目")
        .addFields({
          name: "饅頭遣いのおもちゃ箱通知チャンネル",
          value: manjuSummonerChannelId,
          inline: true,
        });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (interaction.options.getSubcommand() === "饅頭遣いのおもちゃ箱") {
      const channel = interaction.options.getChannel("manju_summoner_channel");

      dbData.settings.manjuSummonerChannel = channel.id;

      await updateGuildSettings(guildId, dbData);

      await interaction.reply({ content: `データベースに保存しました`, flags: MessageFlags.Ephemeral });
    }
  }
};
