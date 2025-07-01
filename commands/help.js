const { Events, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, MessageFlags  } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Helpページ"),

  async execute(client, interaction) {
    const commands = client.commands.filter((x) => x.firstPage !== false);
    const commandsName = commands.map((a) => a.data.name);
    const commandsDep = commands.map((a) => a.data.description);
    
    const settingsCommands = client.commands.filter((x) => x.firstPage == false);
    const settingsCommandsOpt = settingsCommands.map(a => a.data.options);
    const settingsCommandsName = settingsCommandsOpt.flat().map(command => command.name)
    const settingsCommandsDep = settingsCommandsOpt.flat().map(command => command.description);
    
    
    const next = new ButtonBuilder()
		.setCustomId('next')
		.setLabel("→")
		.setStyle(ButtonStyle.Secondary);
    
    const previous = new ButtonBuilder()
		.setCustomId('previous')
		.setLabel("←")
		.setStyle(ButtonStyle.Secondary);
    
    let row = new ActionRowBuilder()
		.addComponents(next);

    //コマンド一覧取得
    let Fields=[];
    for (let i = 0; i < commandsName.length; i++) {
      Fields.push(
        { name: "/" + commandsName[i], value: commandsDep[i], inline: false }
      );
    }
    
    //設定コマンド一覧取得
    let settingsFields=[];
    for (let i = 0; i < settingsCommandsName.length; i++) {
      settingsFields.push(
        { name: "/サーバー設定 " + settingsCommandsName[i], value: settingsCommandsDep[i], inline: false }
      );
    }
    
    const originalDate = new Date(interaction.guild.createdAt);
    const datems = originalDate.getTime();
    const date = Math.floor(datems / 1000); 
    
    const allMemberCountArr = client.guilds.cache.map( guild => guild.memberCount)
    const allMemberCount = allMemberCountArr.reduce((total, current) => total + current, 0);
    
    const embed1 = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("Help Page: :one:")
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
    .setDescription(
      "このサーバーは[YMM4情報サイト](https://ymm4-info.net/)のDiscordサーバーです\n"+
      "非公式ではありますがYMM4のコミュニティーサーバーとしても運営されています\n" +
      "[𝕏(旧Twitter)](https://twitter.com/YMM4_info)\n"+
      "[YMM4情報サイト](https://ymm4-info.net/)"
    )
    .addFields(
      {name: "このサーバーのメンバー数", value: interaction.guild.memberCount + "名", inline: true },
      {name: "参加サーバーのメンバー数合計", value: `${allMemberCount}名`, inline: true }
    )
    .setFooter({ text: 'Help Pageは5分間のみ反応します。'});
    
    const embed2 = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("Help Page: :two:")
    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
    .setDescription("コマンド一覧\n\n")
    .addFields(Fields)
    .setFooter({ text: 'Help Pageは5分間のみ反応します。'});
    
    const embed3 = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("Help Page: :three:")
    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
    .setDescription("サーバー設定コマンド一覧")
    .addFields(settingsFields)
    .setFooter({ text: 'Help Pageは5分間のみ反応します。'});
    
    let Pages = [
      embed1,
      embed2,
      embed3
    ]
    let page = 0;
    
    interaction.reply({ embeds: [Pages[page]], components:[row], flags: MessageFlags.Ephemeral })
    .then(message=>{
      const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });
      collector.on('collect', i => {
        if (i.customId === "next") {
          page++
          if(page == Pages.length-1){
            row = new ActionRowBuilder()
            .addComponents(previous);
            interaction.editReply({ embeds: [Pages[page]], components:[row], flags: MessageFlags.Ephemeral });
            //i.reply({content:`${page+1}ページを表示します`, flags: MessageFlags.Ephemeral});
          }else{
            row = new ActionRowBuilder()
            .addComponents(previous,next);
            interaction.editReply({ embeds: [Pages[page]], components:[row], flags: MessageFlags.Ephemeral });
            //i.reply({content:`${page+1}ページを表示します`, flags: MessageFlags.Ephemeral});
          }
        }
        
        if (i.customId === "previous") {
          page--
          if(page == 0){
            row = new ActionRowBuilder()
            .addComponents(next);
            interaction.editReply({ embeds: [Pages[page]], components:[row], flags: MessageFlags.Ephemeral });
            //i.reply({content:`${page+1}ページを表示します`, flags: MessageFlags.Ephemeral});
          }else{
            row = new ActionRowBuilder()
            .addComponents(previous,next);
            interaction.editReply({ embeds: [Pages[page]], components:[row], flags: MessageFlags.Ephemeral });
            //i.reply({content:`${page+1}ページを表示します`, flags: MessageFlags.Ephemeral});
          }
        }
      });
    })
  },
};
