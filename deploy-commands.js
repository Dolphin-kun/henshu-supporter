require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { clientId, guildId } = require('./config.json');
const fs = require('node:fs');

const globalCommands = []; // グローバル用コマンドの配列
const adminCommands = []; // サーバー管理者用コマンドの配列

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	if ('data' in command && 'execute' in command) {
        if (command.adminOnly) {
            adminCommands.push(command.data.toJSON());
        } else {
            globalCommands.push(command.data.toJSON());
        }
    } else {
        console.log(`[警告] ${file} のコマンドには "data" または "execute" プロパティがありません。`);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('グローバルコマンドの登録を開始します...');
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: globalCommands },
        );
        console.log(`${globalCommands.length} 件のグローバルコマンドを登録しました。`);

        console.log('管理サーバー用のギルドコマンド登録を開始します...');
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId), // ここで管理サーバーのIDを指定
            { body: adminCommands },
        );
        console.log(`${adminCommands.length} 件の管理用コマンドをサーバー(ID: ${guildId})に登録しました。`);

    } catch (error) {
        console.error(error);
    }
})();
