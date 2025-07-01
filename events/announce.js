const { Events } = require('discord.js');
const config = require("../config.json")

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
    //if (message.author.bot || !message.guild) return;
    if(message.channel.id != config.newsChannel)return;
    if(message.channel.type == 5) {
      if (message.crosspostable) {
        console.log("公開可能なメッセージをアナウンスします。");
        message.crosspost()
          .then(() => message.react("📢"))//メッセージを公開できたらリアクションをする
          .catch(console.error);
      } else {
        message.react("❌")//Botに権限がない場合
      }
    }
	},
};
