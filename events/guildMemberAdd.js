const { Events, GuildMember, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const config = require("../config.json");

module.exports = {
  name: Events.GuildMemberAdd,

  /**
   * @param {GuildMember} member
   */
  execute(member) {
    if (config.guildId !== member.guild.id) return;
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle(`${member.guild.name}へようこそ！`)
      .setDescription(`**<@${member.user.id}>**さん、いらっしゃい！\n\n↓まずはこちら↓\n:one:[ルール](https://discord.com/channels/1232145636367798326/1233066341339234315/1233437017438683256)を確認してください\n:two:<id:customize>でロールを取得するとチャンネルが追加されます\n:three:[自己紹介](https://discord.com/channels/1232145636367798326/1233089074236231794)をしよう！`)
      .addFields({ name: '----任意----', value: 'アンケートにご協力お願い致します。\nこちらは運営が今後の運営方針を決めるための参考にさせていただいております。', inline: true })
      .setTimestamp()
      .setFooter({ text: `メンバーカウント：${member.guild.memberCount}` })

    const select = new StringSelectMenuBuilder()
      .setCustomId('welcomeQ')
      .setPlaceholder('このサーバーをどこで知りましたか？')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('X(旧Twitter)')
          .setDescription('X(旧Twitter)上で')
          .setValue('X(旧Twitter)'),
        new StringSelectMenuOptionBuilder()
          .setLabel('YMM4情報サイト')
          .setDescription('YMM4情報サイト内で')
          .setValue('YMM4情報サイト内で'),
      );

      const row = new ActionRowBuilder()
      .addComponents(select);

      channel.send({ content: `<@${member.user.id}>`, embeds: [embed], components: [row] });

  }
};
