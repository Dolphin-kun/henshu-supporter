const { Events, MessageFlags } = require('discord.js');
const config = require('../config.json');
const { setPendingDmRequest } = require('../utils/forumGuideState');

const MENU_CUSTOM_ID = 'forumGuideUploadTarget';
const DM_OPTION_VALUE = 'dm';
const DM_FORWARD_CHANNEL_ID = '';

const buildThreadMention = (channel) => {
  if (!channel || typeof channel.isThread !== 'function') return null;
  if (!channel.isThread()) return null;
  return `<#${channel.id}>`;
};

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== MENU_CUSTOM_ID) return;

    const channel = interaction.channel;
    if (!channel || typeof channel.isThread !== 'function' || !channel.isThread()) {
      return interaction.reply({
        content: 'この操作はスレッド内でのみ使用できます。',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (channel.ownerId && interaction.user.id !== channel.ownerId) {
      return interaction.reply({
        content: 'スレッド作成者のみ操作できます。',
        flags: MessageFlags.Ephemeral,
      });
    }

    const selection = interaction.values[0];

    if (selection === DM_OPTION_VALUE) {
      const forwardChannelId = DM_FORWARD_CHANNEL_ID || config.administratorChannelId;
      const forwardChannel = interaction.guild?.channels.cache.get(forwardChannelId);

      if (!forwardChannel) {
        return interaction.reply({
          content: 'DM受付の転送先チャンネルが見つかりません。管理者に連絡してください。',
          flags: MessageFlags.Ephemeral,
        });
      }

      const threadId = buildThreadMention(channel) ? channel.id : null;
      setPendingDmRequest(interaction.user.id, {
        guildId: interaction.guildId,
        threadId,
      });

      const dmLines = [
        threadId ? `投稿: <#${threadId}>` : null,
        'このDMにプロジェクトファイルやエラーメッセージを添付して送信してください。',
        '送信された内容は管理者チャンネルに転送され、原因調査に利用されます。',
      ].filter(Boolean);

      try {
        await interaction.user.send({ content: dmLines.join('\n') });
      } catch (error) {
        return interaction.reply({
          content: 'DMを送信できませんでした。DMを開放するか、チャンネル送信をご利用ください。',
          flags: MessageFlags.Ephemeral,
        });
      }

      return interaction.reply({
        content: 'DMを送信しました。内容を送信していただくようお願いします。',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (selection.startsWith('channel:')) {
      const channelId = selection.split(':')[1];
      const channel = interaction.guild?.channels.cache.get(channelId);

      if (!channel) {
        return interaction.reply({
          content: '送信先チャンネルが見つかりません。管理者に連絡してください。',
          flags: MessageFlags.Ephemeral,
        });
      }

      const threadMention = buildThreadMention(channel);
      const replyLines = [
        `送信先: ${channel}`,
        threadMention ? `元の投稿: ${threadMention}` : null,
        'ファイルと一緒に状況説明も添えてください。',
      ].filter(Boolean);

      return interaction.reply({
        content: replyLines.join('\n'),
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: '選択内容を確認できませんでした。もう一度お試しください。',
      flags: MessageFlags.Ephemeral,
    });
  },
};
