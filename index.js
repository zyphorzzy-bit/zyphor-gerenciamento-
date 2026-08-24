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
    TextInputStyle
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

// Função auxiliar para buscar configurações dinâmicas
async function getConfig() {
    const configPadrao = {
        linkSuporte: "https://discord.gg/uAaSXMkUg4",
        emojiAtivado: "<a:ativado:1534611985260609607>",
        emojiDesativado: "<a:desativado:1534611986539876463>",
        emojiAviso: "<:avisos:1539125781320433724>"
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

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const isOwner = OWNERS_IDS.includes(message.author.id);
    const cfg = await getConfig();

    // ==========================================
    // TRAVA GERAL DE SEGURANÇA E EXPIRAÇÃO
    // ==========================================
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
                .setDescription('O período de licença deste bot expirou ou ele foi desativado.\n\nTodos os comandos estão temporariamente bloqueados. Abra um ticket para renovar.')
                .setColor('#ff3333');

            const btnSuporte = new ButtonBuilder()
                .setLabel('Abrir Ticket / Suporte')
                .setEmoji('1539845832004870154')
                .setStyle(ButtonStyle.Link)
                .setUrl(cfg.linkSuporte);

            message.reply({ embeds: [embedExpirado], components: [new ActionRowBuilder().addComponents(btnSuporte)] });
            return; 
        }
    }

    // ==========================================
    // COMANDO DE CONFIGURAÇÕES GERAIS (OWNER)
    // ==========================================
    if ((command === 'z.config' || command === '/config') && isOwner) {
        const embedConfig = new EmbedBuilder()
            .setTitle('<:config:1534611990633250937> Configurações Gerais do Sistema')
            .setDescription('Gerencie as variáveis globais do bot abaixo:\n\n' +
                `• **Link do Suporte:** ${cfg.linkSuporte}\n` +
                `• **Emoji Ativo:** ${cfg.emojiAtivado}\n` +
                `• **Emoji Desativado:** ${cfg.emojiDesativado}\n` +
                `• **Emoji Aviso:** ${cfg.emojiAviso}`)
            .setColor('#5865F2');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_cfg_suporte')
                .setLabel('Alterar Link Suporte')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('btn_cfg_emojis')
                .setLabel('Alterar Emojis')
                .setStyle(ButtonStyle.Secondary)
        );

        return message.channel.send({ embeds: [embedConfig], components: [row] });
    }

    // Painel ADM de Bots
    if (command === 'z.painel-adm' && isOwner) {
        const embedAdm = new EmbedBuilder()
            .setTitle('<:config:1534611990633250937> Central Administrativa')
            .setDescription('Selecione uma opção para gerenciar licenças e bots:')
            .setColor('#ff9900');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('adm_btn_registrar')
                .setLabel('Configurar Bot / Dono')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('adm_btn_addtempo')
                .setLabel('Adicionar Tempo')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('adm_btn_removertempo')
                .setLabel('Remover Tempo')
                .setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [embedAdm], components: [row1] });
    }

    if (command === 'z.stream' && isOwner) {
        const textoStream = args.join(' ');
        if (!textoStream) return message.reply("Uso: `z.stream <mensagem>`");

        client.user.setActivity(textoStream, { type: ActivityType.Streaming, url: "https://www.twitch.tv/discord" });
        await db.set(`stream_status_${client.user.id}`, textoStream);
        return message.reply(`${cfg.emojiAtivado} Status de transmissão alterado para: **"${textoStream}"**`);
    }

    if (command === 'z.painel') {
        const embedSetup = new EmbedBuilder()
            .setTitle('<:config:1534611990633250937> Gerenciamento')
            .setDescription('Gerencie o status e configurações do seu bot abaixo:')
            .setColor('#2b2d31');

        const btnGerenciar = new ButtonBuilder()
            .setCustomId('btn_abrir_gerenciador')
            .setLabel('Gerenciar bot')
            .setEmoji('1540870215640809482')
            .setStyle(ButtonStyle.Secondary);

        return message.channel.send({ embeds: [embedSetup], components: [new ActionRowBuilder().addComponents(btnGerenciar)] });
    }

    if (command === '!ping') {
        return message.reply('Pong!');
    }
});

// ==========================================
// INTERAÇÕES E MODALS
// ==========================================
client.on('interactionCreate', async (interaction) => {
    const isOwner = OWNERS_IDS.includes(interaction.user.id);
    const cfg = await getConfig();

    if (interaction.isButton()) {
        // Configurações Globais
        if (interaction.customId === 'btn_cfg_suporte') {
            if (!isOwner) return interaction.reply({ content: "Apenas Owners!", ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId('modal_cfg_suporte')
                .setTitle('Configurar Link de Suporte');

            const inputLink = new TextInputBuilder()
                .setCustomId('input_link')
                .setLabel("Novo URL do Suporte/Ticket")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("https://discord.gg/...")
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(inputLink));
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'btn_cfg_emojis') {
            if (!isOwner) return interaction.reply({ content: "Apenas Owners!", ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId('modal_cfg_emojis')
                .setTitle('Configurar Emojis');

            const inputAtivo = new TextInputBuilder()
                .setCustomId('input_ativo')
                .setLabel("Emoji Ativado (HTML/Mencao)")
                .setStyle(TextInputStyle.Short)
                .setValue(cfg.emojiAtivado)
                .setRequired(true);

            const inputDesativo = new TextInputBuilder()
                .setCustomId('input_desativo')
                .setLabel("Emoji Desativado")
                .setStyle(TextInputStyle.Short)
                .setValue(cfg.emojiDesativado)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputAtivo),
                new ActionRowBuilder().addComponents(inputDesativo)
            );
            return interaction.showModal(modal);
        }

        // Botoes ADM
        if (interaction.customId === 'adm_btn_registrar') {
            if (!isOwner) return interaction.reply({ content: "Apenas Owners!", ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId('modal_registrar')
                .setTitle('Configurar Bot e Dono');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_marca').setLabel("Marca (ex: z-01)").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_bot_id').setLabel("ID do Bot").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_dono_id').setLabel("ID do Dono").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'adm_btn_addtempo') {
            if (!isOwner) return interaction.reply({ content: "Apenas Owners!", ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId('modal_addtempo')
                .setTitle('Adicionar Tempo');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_marca').setLabel("Marca").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_tempo').setLabel("Tempo (dias, 1h, perm)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'adm_btn_removertempo') {
            if (!isOwner) return interaction.reply({ content: "Apenas Owners!", ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId('modal_removertempo')
                .setTitle('Remover Tempo');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_marca').setLabel("Marca").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_dias').setLabel("Dias a Remover").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        // Painel Cliente
        if (interaction.customId === 'btn_abrir_gerenciador') {
            const botData = await db.get(`bot_${client.user.id}`);
            const ehPermanente = botData?.permanente || false;
            const tempoRestante = (botData?.expiracao || 0) - Date.now();
            
            const dias = Math.max(0, Math.floor(tempoRestante / (1000 * 60 * 60 * 24)));
            const horas = Math.max(0, Math.floor((tempoRestante % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
            const expirado = !ehPermanente && tempoRestante <= 0;
            const estaDesligado = botData?.desligado || false;

            let textoTempo = `${dias}d ${horas}h`;
            if (ehPermanente) textoTempo = "∞ Permanente";
            if (expirado) textoTempo = "Expirado";

            const statusEmoji = (expirado || estaDesligado) ? `${cfg.emojiDesativado} Desligado` : `${cfg.emojiAtivado} Ativo`;
            const donoMencao = botData?.donoId ? `<@${botData.donoId}>` : `<@${interaction.user.id}>`;

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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_toggle_desligar')
                    .setLabel(estaDesligado ? 'Ligar Bot' : 'Desligar Bot')
                    .setStyle(estaDesligado ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('btn_mudar_servidor')
                    .setLabel('Vincular Servidor')
                    .setStyle(ButtonStyle.Secondary)
            );

            return interaction.reply({ embeds: [embedPainel], components: [row], ephemeral: true });
        }

        if (interaction.customId === 'btn_toggle_desligar') {
            const botData = await db.get(`bot_${client.user.id}`);
            botData.desligado = !botData.desligado;
            await db.set(`bot_${client.user.id}`, botData);
            return interaction.update({ content: `${cfg.emojiAtivado} O bot foi **${botData.desligado ? 'desligado' : 'ligado'}** com sucesso!`, components: [] });
        }

        if (interaction.customId === 'btn_mudar_servidor') {
            const botData = await db.get(`bot_${client.user.id}`);
            botData.guildId = interaction.guild.id;
            await db.set(`bot_${client.user.id}`, botData);
            return interaction.reply({ content: `${cfg.emojiAtivado} Servidor vinculado com sucesso!`, ephemeral: true });
        }
    }

    // Submissão dos Modals
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_cfg_suporte') {
            const novoLink = interaction.fields.getTextInputValue('input_link');
            await db.set("config_sistema.linkSuporte", novoLink);
            return interaction.reply({ content: `${cfg.emojiAtivado} Link de suporte alterado para: \`${novoLink}\``, ephemeral: true });
        }

        if (interaction.customId === 'modal_cfg_emojis') {
            const atv = interaction.fields.getTextInputValue('input_ativo');
            const des = interaction.fields.getTextInputValue('input_desativo');
            await db.set("config_sistema.emojiAtivado", atv);
            await db.set("config_sistema.emojiDesativado", des);
            return interaction.reply({ content: `${atv} Emojis atualizados com sucesso!`, ephemeral: true });
        }

        if (interaction.customId === 'modal_registrar') {
            const marca = interaction.fields.getTextInputValue('input_marca').toLowerCase();
            const botId = interaction.fields.getTextInputValue('input_bot_id');
            const donoId = interaction.fields.getTextInputValue('input_dono_id');

            const botExistente = (await db.get(`bot_${botId}`)) || {};
            await db.set(`bot_${botId}`, {
                marca, botId, donoId,
                guildId: botExistente.guildId || null,
                expiracao: botExistente.expiracao || Date.now(),
                desligado: botExistente.desligado || false,
                permanente: botExistente.permanente || false
            });
            await db.set(`marca_${marca}`, botId);

            return interaction.reply({ content: `${cfg.emojiAtivado} Marca **${marca.toUpperCase()}** registrada para <@${donoId}>!`, ephemeral: true });
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
                return interaction.reply({ content: `${cfg.emojiAtivado} Marca **${marca.toUpperCase()}** alterada para PERMANENTE!`, ephemeral: true });
            }

            let msAdicionados = 0;
            if (opcao.toLowerCase() === '1h') msAdicionados = 3600000;
            else if (opcao.toLowerCase() === '60d') msAdicionados = 5184000000;
            else msAdicionados = parseInt(opcao) * 86400000;

            dadosBot.permanente = false;
            dadosBot.expiracao = baseTempo + msAdicionados;
            await db.set(`bot_${botIdVinculado}`, dadosBot);

            return interaction.reply({ content: `${cfg.emojiAtivado} Tempo adicionado para **${marca.toUpperCase()}**!`, ephemeral: true });
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

            return interaction.reply({ content: `${cfg.emojiAtivado} Removidos **${dias} dias** da marca **${marca.toUpperCase()}**!`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
