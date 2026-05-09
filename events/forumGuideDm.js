const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../config.json');
const {
  getPendingDmRequest,
  refreshPendingDmRequest,
} = require('../utils/forumGuideState');

const DM_FORWARD_CHANNEL_ID = '';

const truncate = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

const containsNonAscii = (value) => /[^\x20-\x7E]/.test(value);

const getFileNameFromUrl = (url) => {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split('/').pop();
    return lastSegment ? decodeURIComponent(lastSegment) : null;
  } catch (_) {
    return null;
  }
};

const resolveAttachmentName = (attachment) => {
  const urlName = getFileNameFromUrl(attachment.url);
  if (urlName && containsNonAscii(urlName)) return urlName;

  const directName = attachment.name ? String(attachment.name).trim() : '';
  if (directName) return directName;

  return urlName || 'attachment';
};

const buildForwardedFiles = async (attachments) => {
  const files = [];

  for (const attachment of attachments.values()) {
    const fileName = resolveAttachmentName(attachment);
    const needsReupload = containsNonAscii(fileName);

    if (!needsReupload) {
      files.push({ attachment: attachment.url, name: fileName });
      continue;
    }

    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      files.push(new AttachmentBuilder(Buffer.from(arrayBuffer), { name: fileName }));
    } catch (error) {
      files.push({ attachment: attachment.url, name: fileName });
    }
  }

  return files;
};

const buildFileNameFieldValue = (attachments) => {
  if (!attachments || attachments.size === 0) return null;

  const lines = [];
  for (const attachment of attachments.values()) {
    const name = resolveAttachmentName(attachment);
    lines.push(`- ${name}`);
  }

  return truncate(lines.join('\n'), 1024);
};

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (typeof message.inGuild === 'function' && message.inGuild()) return;

    const pending = getPendingDmRequest(message.author.id);
    if (!pending) return;

    const guild = message.client.guilds.cache.get(pending.guildId);
    if (!guild) return;

    const forwardChannelId = DM_FORWARD_CHANNEL_ID || config.administratorChannelId;
    const forwardChannel = guild.channels.cache.get(forwardChannelId);
    if (!forwardChannel) {
      await message.reply('転送先チャンネルが見つかりません。管理者に連絡してください。');
      return;
    }

    refreshPendingDmRequest(message.author.id);

    const threadLink = pending.threadId
      ? `https://discord.com/channels/${guild.id}/${pending.threadId}`
      : null;

    const embed = new EmbedBuilder()
      .setColor('Yellow')
      .setTitle('DMで受け取ったファイル')
      .setDescription(
        `送信者: <@${message.author.id}>\n元スレッド: ${threadLink ?? '不明'}`
      );

    if (message.content) {
      embed.addFields({ name: 'メッセージ', value: truncate(message.content, 1024) });
    }

    const fileNameField = buildFileNameFieldValue(message.attachments);
    if (fileNameField) {
      embed.addFields({ name: 'ファイル名', value: fileNameField });
    }

    const files = await buildForwardedFiles(message.attachments);

    await forwardChannel.send({
      embeds: [embed],
      files: files.length > 0 ? files : undefined,
    });

    if (message.attachments.size > 0) {
      await message.reply('ファイルを確認しました。管理者が内容を確認するまでお待ちください。');
    } else {
      await message.reply('メッセージを受け取りました。ファイルがある場合はこのDMに添付して追加で送信してください。');
    }
  },
};
