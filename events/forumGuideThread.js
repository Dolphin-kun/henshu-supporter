const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const config = require('../config.json');

const MENU_CUSTOM_ID = 'forumGuideUploadTarget';
const DM_OPTION_VALUE = 'dm';

const MESSAGE_LINES = [
  '原因調査のため、可能であれば問題が発生するプロジェクトファイルの共有をお願いします',
];

const PRIVACY_LINES = [
  'プロジェクトファイルやエラーメッセージにはPCのユーザー名が含まれる可能性があります。',
  '公開に不安がある場合はDM送信を利用してください。',
];

const ALLOW_DM = true;
const UPLOAD_CHANNEL_IDS = [];

const normalizeStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }
  const asString = String(value).trim();
  return asString ? [asString] : [];
};

const buildBulletList = (lines) => lines.map((line) => `- ${line}`).join('\n');

module.exports = {
  name: Events.ThreadCreate,
  async execute(thread, newlyCreated) {
    if (!newlyCreated) return;
    if (!thread?.guild) return;

    const forumIds = normalizeStringArray(config.forumGuideForumIds);
    if (forumIds.length === 0) return;
    if (!forumIds.includes(thread.parentId)) return;
    if (thread.ownerId === thread.client.user?.id) return;

    const messageLines = MESSAGE_LINES;
    const privacyLines = PRIVACY_LINES;

    const uploadChannelIds = normalizeStringArray(UPLOAD_CHANNEL_IDS);
    const allowDm = ALLOW_DM;

    const selectOptions = [];

    for (const channelId of uploadChannelIds) {
      const channel = thread.guild.channels.cache.get(channelId);
      if (!channel) continue;

      selectOptions.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(`#${channel.name}`)
          .setDescription('このチャンネルに送信')
          .setValue(`channel:${channel.id}`)
      );
    }

    if (allowDm) {
      selectOptions.push(
        new StringSelectMenuOptionBuilder()
          .setLabel('DMで送る')
          .setDescription('BotがDMで案内します')
          .setValue(DM_OPTION_VALUE)
      );
    }

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('ご案内')
      .setDescription(buildBulletList(messageLines));

    if (privacyLines.length > 0) {
      embed.addFields({ name: '注意', value: buildBulletList(privacyLines) });
    }

    if (selectOptions.length > 0) {
      embed.addFields({ name: 'ファイルの送信先', value: '下のメニューから送信先を選択してください。' });
    }

    const components = [];
    if (selectOptions.length > 0) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(MENU_CUSTOM_ID)
        .setPlaceholder('ファイルの送信先を選択')
        .addOptions(selectOptions.slice(0, 25));

      components.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    await thread.send({ embeds: [embed], components });
  },
};
