const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');

const uri = `mongodb+srv://YMM4-Bot:${process.env.MongoDB_Pass}@ymm4-discord-bot.5cysdgh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

async function addPluginToGlobalList(owner, repo) {
    await client.connect();
    const db = client.db('YMM4-Discord-Bot');
    const collection = db.collection('watched_plugins');

    const existing = await collection.findOne({ owner, repo });
    if (existing) {
        return { status: 'exists', release: null };
    }

    let latestRelease = null;
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
            headers: {
                headers: { "user-agent": "YMM4Info-DiscordBot" }
            }
        });
        if (response.ok) {
            latestRelease = await response.json();
        }
    } catch (error) {
        console.error(`[GitHub API] ${owner}/${repo} の最新リリース取得に失敗しました:`, error);
    }

    await collection.insertOne({
        owner,
        repo,
        lastReleaseId: latestRelease ? latestRelease.id : null,
        repoUrl: `https://github.com/${owner}/${repo}`
    });
    return { status: 'added', release: latestRelease };
}

async function getAnnounceChannelIds() {
    await client.connect();
    const db = client.db('YMM4-Discord-Bot');
    const settingsCollection = db.collection('settings');
    const allGuildSettings = await settingsCollection.find(
        { 'settings.pluginAnnounceChannel': { $exists: true, $ne: null } }
    ).toArray();
    return allGuildSettings.map(guild => guild.settings.pluginAnnounceChannel);
}

async function getAllWatchedPlugins() {
    await client.connect();
    const db = client.db('YMM4-Discord-Bot');
    const collection = db.collection('watched_plugins');
    // ownerとrepoでソートして取得
    return await collection.find({}).sort({ owner: 1, repo: 1 }).toArray();
}

async function removePluginFromGlobalList(owner, repo) {
    await client.connect();
    const db = client.db('YMM4-Discord-Bot');
    const collection = db.collection('watched_plugins');
    const result = await collection.deleteOne({ owner, repo });
    return result.deletedCount > 0; // 削除できたら true を返す
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('プラグイン更新通知')
        .setDescription('プラグインの更新通知を管理します[サーバー管理者のみ]')
        .addSubcommand(subcommand =>
            subcommand
                .setName('登録')
                .setDescription('新しいGitHubプラグインを登録し、更新を監視します')
                .addStringOption(option =>
                    option.setName('link')
                        .setDescription('GitHubリポジトリのURL')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('削除')
                .setDescription('プラグインを監視リストから削除します')
                .addStringOption(option =>
                    option.setName('link')
                        .setDescription('GitHubリポジトリのURL')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('一覧')
                .setDescription('監視中のプラグインを一覧表示し、管理します'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    adminOnly: true,

    async execute(client, interaction) {
        if (interaction.options.getSubcommand() === '一覧') {
            let allPlugins = await getAllWatchedPlugins();

            if (allPlugins.length === 0) {
                await interaction.reply({ content: '監視中のプラグインはありません。', flags: MessageFlags.Ephemeral });
                return;
            }

            const pluginsPerPage = 5;
            let currentPage = 0;

            const generateMessage = (page) => {
                const totalPages = Math.ceil(allPlugins.length / pluginsPerPage);
                const startIndex = page * pluginsPerPage;
                const pagePlugins = allPlugins.slice(startIndex, startIndex + pluginsPerPage);

                const embed = new EmbedBuilder()
                    .setTitle('監視中のプラグイン一覧')
                    .setColor('Aqua')
                    .setDescription('下のメニューからプラグインを選択して削除できます。')
                    .setFooter({ text: `ページ ${page + 1} / ${totalPages}` });

                if (pagePlugins.length === 0 && page > 0) {
                    // 削除によって現在のページが空になった場合、前のページに移動
                    currentPage--;
                    return generateMessage(currentPage);
                }

                pagePlugins.forEach((plugin, index) => {
                    embed.addFields({
                        name: `${startIndex + index + 1}. ${plugin.owner}/${plugin.repo}`,
                        value: `[GitHubで見る](${plugin.repoUrl})`
                    });
                });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('delete_plugin_select')
                    .setPlaceholder('削除するプラグインを選択...')
                    .addOptions(pagePlugins.map((plugin, index) => ({
                        label: `${startIndex + index + 1}. ${plugin.owner}/${plugin.repo}`,
                        value: `${plugin.owner}/${plugin.repo}`
                    })));

                const prevButton = new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('◀️ 前へ')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('次へ ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1);

                return {
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder().addComponents(selectMenu),
                        new ActionRowBuilder().addComponents(prevButton, nextButton)
                    ],
                };
            };

            const message = await interaction.reply(generateMessage(currentPage));
            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button | ComponentType.StringSelect, time: 120000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: 'この操作はコマンドを実行した本人しか行えません。', flags: MessageFlags.Ephemeral });
                    return;
                }

                if (i.isButton()) {
                    if (i.customId === 'prev_page') {
                        currentPage--;
                    } else if (i.customId === 'next_page') {
                        currentPage++;
                    }
                    await i.update(generateMessage(currentPage));
                }

                if (i.isStringSelectMenu()) {
                    const selectedValue = i.values[0];
                    const [owner, repo] = selectedValue.split('/');
                    const success = await removePluginFromGlobalList(owner, repo);
                    if (success) {
                        await i.reply({ content: `✅ プラグイン「${selectedValue}」を削除しました。`, flags: MessageFlags.Ephemeral });
                        // リストを再取得して更新
                        allPlugins = await getAllWatchedPlugins();
                        await interaction.editReply(generateMessage(currentPage));
                    } else {
                        await i.reply({ content: `❌ プラグイン「${selectedValue}」の削除に失敗しました。`, flags: MessageFlags.Ephemeral });
                    }
                }
            });

            collector.on('end', () => {
                message.edit({ components: [] }).catch(() => { });
            });
            return;
        }



        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const githubUrl = interaction.options.getString('link');
        const githubRepoRegex = /https?:\/\/github\.com\/([^/]+)\/([^/]+)/;
        const match = githubUrl.match(githubRepoRegex);

        if (!match) {
            await interaction.editReply('有効なGitHubリポジトリのURLを入力してください。\n例: `https://github.com/owner/repo`');
            return;
        }

        const owner = match[1];
        const repo = match[2].replace(/\.git$/, '');

        try {
            // --- 登録処理 ---
            if (interaction.options.getSubcommand() === '登録') {
                const result = await addPluginToGlobalList(owner, repo);

                if (result.status === 'exists') {
                    await interaction.editReply(`プラグイン「${owner}/${repo}」は既に監視リストに登録されています。`);
                    return; // 処理を終了
                }

                await interaction.editReply(`プラグイン「${owner}/${repo}」を全サーバー共通の監視リストに追加しました。`);

                // 初回リリース情報があれば、全チャンネルにアナウンス
                if (result.release) {
                    const initialRelease = result.release;
                    const allChannelIds = await getAnnounceChannelIds();

                    const embed = new EmbedBuilder()
                        .setColor('Yellow')
                        .setTitle(`${repo} プラグインが公開されました！`)
                        .setDescription(`**[${initialRelease.name || initialRelease.tag_name}](${initialRelease.html_url})** がリリースされました！`)
                        .setThumbnail(initialRelease.author.avatar_url)
                        .setTimestamp(new Date(initialRelease.published_at));

                    if (initialRelease.body) {
                        const bodyText = initialRelease.body.length > 1020 ? `${initialRelease.body.substring(0, 1020)}...` : initialRelease.body;
                        embed.addFields({ name: '概要', value: bodyText });
                    }

                    // 全ての通知用チャンネルに一斉送信
                    for (const channelId of allChannelIds) {
                        try {
                            const channel = await client.channels.fetch(channelId);
                            if (channel) await channel.send({ embeds: [embed] });
                        } catch (err) {
                            console.error(`初回アナウンスの送信に失敗 (ChannelID: ${channelId}):`, err.message);
                        }
                    }
                }
            }
            // --- 削除処理 ---
            else if (interaction.options.getSubcommand() === '削除') {
                const success = await removePluginFromGlobalList(owner, repo);

                if (success) {
                    await interaction.editReply(`プラグイン「${owner}/${repo}」を監視リストから削除しました。`);
                } else {
                    await interaction.editReply(`プラグイン「${owner}/${repo}」は監視リストに見つかりませんでした。`);
                }
            }


        } catch (error) {
            console.error(error);
            await interaction.editReply('処理中にエラーが発生しました。詳細はコンソールを確認してください。');
        }
    }
};