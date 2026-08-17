const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { MongoClient } = require('mongodb');
const { getMongoUri } = require('../utils/mongoClient');

const client = new MongoClient(getMongoUri());

async function getGuildSettings(guildId) {
  const db = client.db('YMM4-Discord-Bot');
  const collection = db.collection('settings');
  const settings = await collection.findOne({ guildId });
  return settings;
}

async function updateGuildSettings(guildId, newSettings) {
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
    .addSubcommand(subcommand =>
      subcommand
        .setName('饅頭遣いのおもちゃ箱_設定解除')
        .setDescription('饅頭遣いのおもちゃ箱の最新情報の共有を解除します'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('プラグイン更新通知チャンネル')
        .setDescription('プラグインの更新情報を共有するチャンネルを変更します')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('通知を送信するチャンネルを指定してください')
            .setRequired(true)
        ))
    .addSubcommand(subcommand =>
      subcommand
        .setName('プラグイン更新通知チャンネル_設定解除')
        .setDescription('プラグインの更新情報の共有を解除します'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  firstPage: false,

  /**
   * 
   * @param {*} client 
   * @param {import('discord.js').Interaction} interaction 
   */
  async execute(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    let dbData = await getGuildSettings(guildId);

    if (!dbData) {
      const newConfig = {
        guildId: guildId,
        settings: {
          manjuSummonerChannel: null,
          pluginAnnounceChannel: null,
        },
      };
      await updateGuildSettings(guildId, newConfig);
      dbData = newConfig;
    }

    if (!dbData.settings) {
      dbData.settings = {};
    }

    if (interaction.options.getSubcommand() === "設定の確認") {
      const manjuSummonerChannelId = dbData.settings.manjuSummonerChannel
        ? `<#${dbData.settings.manjuSummonerChannel}>`
        : "設定されていません";

      const pluginAnnounceChannelId = dbData.settings.pluginAnnounceChannel
        ? `<#${dbData.settings.pluginAnnounceChannel}>`
        : "設定されていません";

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("サーバー設定")
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setDescription("1ページ目")
        .addFields(
          { name: "饅頭遣いのおもちゃ箱通知チャンネル", value: manjuSummonerChannelId, inline: true },
          { name: "プラグイン更新通知チャンネル", value: pluginAnnounceChannelId, inline: true }
        );

      await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (interaction.options.getSubcommand() === "饅頭遣いのおもちゃ箱") {
      const channel = interaction.options.getChannel("manju_summoner_channel");

      dbData.settings.manjuSummonerChannel = channel.id;

      await updateGuildSettings(guildId, dbData);

      await interaction.editReply({ content: `饅頭遣いのおもちゃ箱の更新通知チャンネルを <#${channel.id}> に設定しました。`, flags: MessageFlags.Ephemeral });
    }

    if (interaction.options.getSubcommand() === "プラグイン更新通知チャンネル") {
      const channel = interaction.options.getChannel("channel");

      if (!dbData.settings) {
        dbData.settings = {};
      }
      dbData.settings.pluginAnnounceChannel = channel.id;

      await updateGuildSettings(guildId, dbData);
      await interaction.editReply({ content: `プラグイン更新通知チャンネルを <#${channel.id}> に設定しました。`, flags: MessageFlags.Ephemeral });
    }

    if (interaction.options.getSubcommand() === "饅頭遣いのおもちゃ箱_設定解除") {
      dbData.settings.manjuSummonerChannel = null;
      await updateGuildSettings(guildId, dbData);
      await interaction.editReply({ content: `「饅頭遣いのおもちゃ箱」の通知チャンネル設定を解除しました。`, flags: MessageFlags.Ephemeral });
    }

    if (interaction.options.getSubcommand() === "プラグイン更新通知チャンネル_設定解除") {
      dbData.settings.pluginAnnounceChannel = null;
      await updateGuildSettings(guildId, dbData);
      await interaction.editReply({ content: `「プラグイン更新通知チャンネル」の設定を解除しました。`, flags: MessageFlags.Ephemeral });
    }
  }
};
