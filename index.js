const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ActivityType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const OWNERS_IDS = ["1521362851502227588", "1533306874513068093"];
const CANAL_LOGS_REGISTRO = "ID_DO_CANAL_DE_TEXTO_AQUI"; // Coloque o ID do canal onde os tópicos serão criados

async function getConfig() {
    const configPadrao = {
        linkSuporte: "https://discord.gg/uAaSXMkUg4",
        emojiAtivado: "<a:ativado:1534611985260609607>",
        emojiDesativado: "<a:desativado:1534611986539876463>",
        emojiAviso: "<:avisos:1539125781320433724>",
        mensagemExpirado: "O período de licença deste bot expirou ou ele foi desativado pelo gerenciador.\n\nNenhum comando funcionará até que a assinatura seja renovada."
    };
    const salvas = await db.get("config_sistema");
    return { ...configPadrao, ...salvas };
}

client.once('ready', async () => {
    console.log(`🤖 Bot ${client.user.tag} online!`);

    const statusSalvo = await db.get(`stream_status_${client.user.id}`);
    if (statusSalvo) {
        client.user.setActivity(statusSalvo, { type: ActivityType.Streaming, url: "https://www.twitch.tv/discord" });
    }
});

// KITA AUTOMÁTICO SE ADICIONAREM EM SERVIDOR NÃO VINCULADO
client.on('guildCreate', async (guild) => {
    const botData = await db.get(`bot_${client.user.id}`);
    if (botData && botData.guildId && botData.guildId !== guild.id) {
        console.log(`🚪 Bot adicionado no servidor não autorizado ${guild.name}. Saindo...`);
        await guild.leave();
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const isOwner = OWNERS_IDS.includes(message.author.id);
    const cfg = await getConfig();

    // TRAVA DE SEGURANÇA E EXPIRAÇÃO
    const botData = await db.get(`bot_${client.user.id}`);

    if (botData) {
        const ehPermanente = botData.permanente || false;
        const expirado = !ehPermanente && (Date.now() > botData.expiracao);

        if (botData.guildId && message.guild && message.guild.id !== botData.guildId && !isOwner) {
            return;
        }

        if ((expirado || botData.desligado) && !isOwner) {
            const embedExpirado = new EmbedBuilder()
                .setTitle(`${cfg.emojiAviso} Sistema Expirado / Desligado`)
                .setDescription(cfg.mensagemExpirado)
                .setColor('#ff3333');

            const btnSuporte = new ButtonBuilder()
                .setLabel('Abrir Ticket / Suporte')
                .setEmoji('1539845832004870154')
                .setStyle(ButtonStyle.Link)
                .setUrl(cfg.linkSuporte);

            return message.reply({ embeds: [embedExpirado], components: [new ActionRowBuilder().addComponents(btnSuporte)] });
        }
    }

    // COMANDOS DE ADMIN (Z.CONFIG)
    if ((command === 'z.config' || command === '/config') && isOwner) {
        const embedConfig = new EmbedBuilder()
            .setTitle('<:config:1534611990633250937> Configurações Gerais')
            .setDescription(
                `• **Link do Suporte:** ${cfg.linkSuporte}\n` +
                `• **Emoji Ativo:** ${cfg.emojiAtivado}\n` +
                `• **Emoji Desativado:** ${cfg.emojiDesativado}\n\n` +
                `📜 **Mensagem de Expirado atual:**\n> ${cfg.mensagemExpirado}`
            )
            .setColor('#5865F2');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_cfg_suporte').setLabel('Alterar Link Suporte').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_cfg_msg_expirado').setLabel('Alterar Msg Expiração').setStyle(ButtonStyle.Secondary)
        );

        return message.channel.send({ embeds: [embedConfig], components: [row] });
    }

    if (command === 'z.painel-adm' && isOwner) {
        const embedAdm = new EmbedBuilder()
            .setTitle('<:config:1534611990633250937> Central Administrativa')
            .setDescription('Gerencie as licenças dos bots registrados:')
            .setColor('#ff9900');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('adm_btn_registrar').setLabel('Configurar Bot / Dono').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('adm_btn_addtempo').setLabel('Adicionar Tempo').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('adm_btn_removertempo').setLabel('Remover Tempo').setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [embedAdm], components: [row1] });
    }

    if (command === 'z.painel') {
        const embedSetup = new EmbedBuilder()
            .setTitle('<:config:1534611990633250937> Gerenciamento')
            .setDescription('Aqui você pode gerenciar completamente o seu bot.\nInicie o gerenciamento clicando no botão abaixo:')
            .setColor('#2b2d31');

        const btnGerenciar = new ButtonBuilder()
            .setCustomId('btn_abrir_gerenciador')
            .setLabel('Gerenciar bot')
            .setEmoji('1540870215640809482')
            .setStyle(ButtonStyle.Secondary);

        return message.channel.send({ embeds: [embedSetup], components: [new ActionRowBuilder().addComponents(btnGerenciar)] });
    }
});

// INTERAÇÕES E EVENTOS DE PAINEL
client.on('interactionCreate', async (interaction) => {
    const isOwner = OWNERS_IDS.includes(interaction.user.id);
    const cfg = await getConfig();

    if (interaction.isButton()) {
        const botData = await db.get(`bot_${client.user.id}`);
        
        // VERIFICA SE É O DONO DO BOT OU UM OWNER DO SISTEMA
        const isDonoDoBot = (botData && botData.donoId === interaction.user.id) || isOwner;

        // ABERTURA DO PAINEL DE GERENCIAMENTO (Qualquer um pode abrir para ver, mas as ações dentro exigem ser o dono)
        if (interaction.customId === 'btn_abrir_gerenciador') {
            const ehPermanente = botData?.permanente || false;
            const tempoRestante = (botData?.expiracao || 0) - Date.now();
            
            const dias = Math.max(0, Math.floor(tempoRestante / (1000 * 60 * 60 * 24)));
            const horas = Math.max(0, Math.floor((tempoRestante % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
            const expirado = !ehPermanente && tempoRestante <= 0;
            const estaDesligado = botData?.desligado || false;

            let textoTempo = `${dias}d ${horas}h`;
            if (ehPermanente) textoTempo = "∞ Permanente";
            if (expirado) textoTempo = "Expirado";

            const statusEmoji = (expirado || estaDesligado) ? `${cfg.emojiDesativado} Desligado` : `${cfg.emojiAtivo} Ativo`;
            const donoMencao = botData?.donoId ? `<@${botData.donoId}>` : `Não definido`;

            const embedPainel = new EmbedBuilder()
                .setTitle(`<:config:1534611990633250937> Gerenciamento do ${botData?.marca?.toUpperCase() || 'BOT'}`)
                .addFields({
                    name: '<:zyphor:1540096483276095621> Informações',
                    value: 
                    `<:ID:1534611999085039786> **Nome do bot:** ${botData?.marca?.toUpperCase() || 'BOT'}\n` +
                    `<:horrio:1534611997335883886> **Tempo restante:** ${textoTempo}\n` +
                    `<:perfil:1540557352602705990> **Status:** ${statusEmoji}\n` +
                    `<:user:1539125800907968603> **Dono/Posse:** ${donoMencao}`
                })
                .setColor('#2b2d31');

            const rowComponents = [
                new ButtonBuilder()
                    .setCustomId('btn_toggle_desligar')
                    .setLabel(estaDesligado ? 'Ligar Bot' : 'Desligar Bot')
                    .setStyle(estaDesligado ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('btn_mudar_servidor')
                    .setLabel('Vincular Servidor')
                    .setStyle(ButtonStyle.Secondary)
            ];

            if (botData?.linkInstalacao) {
                rowComponents.push(
                    new ButtonBuilder()
                        .setLabel('Adicionar Bot')
                        .setStyle(ButtonStyle.Link)
                        .setUrl(botData.linkInstalacao)
                );
            }

            const row = new ActionRowBuilder().addComponents(rowComponents);

            return interaction.reply({ embeds: [embedPainel], components: [row], ephemeral: true });
        }

        // LIGAR / DESLIGAR (APENAS DONO DO BOT OU OWNER)
        if (interaction.customId === 'btn_toggle_desligar') {
            if (!isDonoDoBot) {
                return interaction.reply({ content: "<:not:1539815573981237388> Apenas o cliente dono deste bot ou os administradores podem alterar o status!", ephemeral: true });
            }

            botData.desligado = !botData.desligado;
            await db.set(`bot_${client.user.id}`, botData);

            return interaction.reply({ content: `${cfg.emojiAtivado} O bot foi **${botData.desligado ? 'desligado' : 'ligado'}** com sucesso!`, ephemeral: true });
        }

        // VINCULAR E KITAR DO ANTIGO (APENAS DONO DO BOT OU OWNER)
        if (interaction.customId === 'btn_mudar_servidor') {
            if (!isDonoDoBot) {
                return interaction.reply({ content: "<:not:1539815573981237388> Apenas o cliente dono deste bot ou os administradores podem vincular o servidor!", ephemeral: true });
            }

            const servidorAntigoId = botData.guildId;
            const novoServidorId = interaction.guild.id;

            botData.guildId = novoServidorId;
            await db.set(`bot_${client.user.id}`, botData);

            await interaction.reply({ content: `${cfg.emojiAtivado} Servidor atual vinculado com sucesso!`, ephemeral: true });

            if (servidorAntigoId && servidorAntigoId !== novoServidorId) {
                const guildAntiga = client.guilds.cache.get(servidorAntigoId);
                if (guildAntiga) {
                    await guildAntiga.leave();
                }
            }
            return;
        }

        // BOTOES DE CONFIGURAÇÃO DO SISTEMA (APENAS OWNERS)
        if (interaction.customId === 'btn_cfg_suporte' && isOwner) {
            const modal = new ModalBuilder().setCustomId('modal_cfg_suporte').setTitle('Configurar Link de Suporte');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_link').setLabel("Novo URL").setStyle(TextInputStyle.Short).setRequired(true)));
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'btn_cfg_msg_expirado' && isOwner) {
            const modal = new ModalBuilder().setCustomId('modal_cfg_msg_expirado').setTitle('Configurar Msg de Expiração');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_msg').setLabel("Mensagem de Expiração").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return interaction.showModal(modal);
        }

        // BOTOES ADMINISTRATIVOS (APENAS OWNERS)
        if (interaction.customId === 'adm_btn_registrar' && isOwner) {
            const modal = new ModalBuilder().setCustomId('modal_registrar').setTitle('Configurar Bot e Dono');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_marca').setLabel("Marca (ex: z-01)").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_bot_id').setLabel("ID do Bot").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_dono_id').setLabel("ID do Dono").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_link_inst').setLabel("Link de Instalação (OAuth2)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'adm_btn_addtempo' && isOwner) {
            const modal = new ModalBuilder().setCustomId('modal_addtempo').setTitle('Adicionar Tempo');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_marca').setLabel("Marca").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_tempo').setLabel("Tempo (ex: 30, perm)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'adm_btn_removertempo' && isOwner) {
            const modal = new ModalBuilder().setCustomId('modal_removertempo').setTitle('Remover Tempo');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_marca').setLabel("Marca").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_dias').setLabel("Dias").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }
    }

    // SUBMISSÃO DE MODALS
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_cfg_suporte') {
            const novoLink = interaction.fields.getTextInputValue('input_link');
            await db.set("config_sistema.linkSuporte", novoLink);
            return interaction.reply({ content: `${cfg.emojiAtivado} Link de suporte alterado com sucesso!`, ephemeral: true });
        }

        if (interaction.customId === 'modal_cfg_msg_expirado') {
            const novaMsg = interaction.fields.getTextInputValue('input_msg');
            await db.set("config_sistema.mensagemExpirado", novaMsg);
            return interaction.reply({ content: `${cfg.emojiAtivado} Mensagem de expiração alterada com sucesso!`, ephemeral: true });
        }

        if (interaction.customId === 'modal_registrar') {
            const marca = interaction.fields.getTextInputValue('input_marca').toLowerCase();
            const botId = interaction.fields.getTextInputValue('input_bot_id');
            const donoId = interaction.fields.getTextInputValue('input_dono_id');
            const linkInstalacao = interaction.fields.getTextInputValue('input_link_inst');

            const botExistente = (await db.get(`bot_${botId}`)) || {};
            const dadosSalvar = {
                marca,
                botId,
                donoId,
                linkInstalacao,
                guildId: botExistente.guildId || null,
                expiracao: botExistente.expiracao || Date.now(),
                desligado: botExistente.desligado || false,
                permanente: botExistente.permanente || false
            };

            await db.set(`bot_${botId}`, dadosSalvar);
            await db.set(`marca_${marca}`, botId);

            try {
                const canalLogs = client.channels.cache.get(CANAL_LOGS_REGISTRO);
                if (canalLogs && canalLogs.type === ChannelType.GuildText) {
                    const thread = await canalLogs.threads.create({
                        name: `bot-${marca}-${botId.slice(-4)}`,
                        autoArchiveDuration: 1440,
                        reason: `Registro do bot ${marca}`
                    });

                    const embedThread = new EmbedBuilder()
                        .setTitle(`📦 Informações do Bot Registrado`)
                        .setDescription(
                            `• **Marca:** \`${marca.toUpperCase()}\`\n` +
                            `• **ID do Bot:** \`${botId}\`\n` +
                            `• **Dono / Cliente:** <@${donoId}> (\`${donoId}\`)\n` +
                            `• **Link de Instalação:** [Clique aqui](${linkInstalacao})\n` +
                            `• **Registrado por:** <@${interaction.user.id}>`
                        )
                        .setColor('#00FFCC')
                        .setTimestamp();

                    await thread.send({ embeds: [embedThread] });
                }
            } catch (err) {
                console.error("Erro ao criar tópico de registro:", err);
            }

            return interaction.reply({ content: `${cfg.emojiAtivado} Marca **${marca.toUpperCase()}** registrada para <@${donoId}> e tópico criado!`, ephemeral: true });
        }

        if (interaction.customId === 'modal_addtempo') {
            const marca = interaction.fields.getTextInputValue('input_marca').toLowerCase();
            const opcao = interaction.fields.getTextInputValue('input_tempo');

            const botIdVinculado = await db.get(`marca_${marca}`);
            if (!botIdVinculado) return interaction.reply({ content: "Marca não encontrada!", ephemeral: true });

            const dadosBot = await db.get(`bot_${botIdVinculado}`);
            const baseTempo = dadosBot.expiracao > Date.now() ? dadosBot.expiracao : Date.now();

            if (opcao.toLowerCase() === 'perm' || opcao.toLowerCase() === 'permanente') {
                dadosBot.permanente = true;
                await db.set(`bot_${botIdVinculado}`, dadosBot);
                return interaction.reply({ content: `${cfg.emojiAtivado} Marca **${marca.toUpperCase()}** setada como PERMANENTE!`, ephemeral: true });
            }

            let msAdicionados = parseInt(opcao) * 86400000;
            dadosBot.permanente = false;
            dadosBot.expiracao = baseTempo + msAdicionados;
            await db.set(`bot_${botIdVinculado}`, dadosBot);

            return interaction.reply({ content: `${cfg.emojiAtivado} Tempo atualizado para **${marca.toUpperCase()}**!`, ephemeral: true });
        }

        if (interaction.customId === 'modal_removertempo') {
            const marca = interaction.fields.getTextInputValue('input_marca').toLowerCase();
            const dias = parseInt(interaction.fields.getTextInputValue('input_dias'));

            const botIdVinculado = await db.get(`marca_${marca}`);
            if (!botIdVinculado) return interaction.reply({ content: "Marca não encontrada!", ephemeral: true });

            const dadosBot = await db.get(`bot_${botIdVinculado}`);
            dadosBot.permanente = false;
            dadosBot.expiracao = Math.max(Date.now(), dadosBot.expiracao - (dias * 86400000));
            await db.set(`bot_${botIdVinculado}`, dadosBot);

            return interaction.reply({ content: `${cfg.emojiAtivado} Dias removidos de **${marca.toUpperCase()}**!`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
