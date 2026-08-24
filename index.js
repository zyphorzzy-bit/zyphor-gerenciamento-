const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ActivityType 
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

// Configurações Gerais
const OWNERS_IDS = ["1521362851502227588", "1533306874513068093"];
const LINK_SUPORTE = "https://discord.gg/uAaSXMkUg4";

// ==========================================
// REGISTRO AUTOMÁTICO NA INICIALIZAÇÃO
// ==========================================
client.once('ready', async () => {
    console.log(`🤖 Bot ${client.user.tag} online!`);

    // Restaura a mensagem de stream se já tiver sido salva no banco
    const statusSalvo = await db.get(`stream_status_${client.user.id}`);
    if (statusSalvo) {
        client.user.setActivity(statusSalvo, {
            type: ActivityType.Streaming,
            url: "https://www.twitch.tv/discord"
        });
    }

    // Verifica se o bot já tem uma marca atribuída no QuickDB
    let botData = await db.get(`bot_${client.user.id}`);

    if (!botData) {
        let contador = (await db.get('contador_marcas')) || 1;
        const numeroFormatado = String(contador).padStart(2, '0');
        const novaMarca = `z-${numeroFormatado}`;

        botData = {
            marca: novaMarca,
            botId: client.user.id,
            guildId: null,
            expiracao: Date.now(),
            desligado: false,
            permanente: false
        };

        await db.set(`bot_${client.user.id}`, botData);
        await db.set(`marca_${novaMarca}`, client.user.id);
        await db.set('contador_marcas', contador + 1);

        console.log(`✨ Bot registrado automaticamente com a marca: ${novaMarca.toUpperCase()}`);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const isOwner = OWNERS_IDS.includes(message.author.id);

    // ==========================================
    // 1. PAINEL E COMANDOS DOS OWNERS
    // ==========================================
    
    // Configurar Status de Stream: z.stream <texto>
    if (command === 'z.stream' && isOwner) {
        const textoStream = args.join(' ');
        if (!textoStream) return message.reply("<:not:1539815573981237388> Uso: `z.stream <mensagem>`");

        client.user.setActivity(textoStream, {
            type: ActivityType.Streaming,
            url: "https://www.twitch.tv/discord"
        });

        await db.set(`stream_status_${client.user.id}`, textoStream);
        return message.reply(`<a:ativado:1534611985260609607> Status de transmissão alterado para: **"${textoStream}"**`);
    }

    if (command === 'z.painel-adm') {
        if (!isOwner) return;

        const embedAdm = new EmbedBuilder()
            .setTitle('<:config:1534611990633250937> Painel de Administração (Owners)')
            .setDescription('Gerencie as licenças e presença do bot:\n\n' +
                '• `z.stream <texto>`\n' +
                '• `z.addtempo <marca> <dias|1h|60d|perm>`\n' +
                '• `z.removertempo <marca> <dias>`\n' +
                '• `z.registrar <marca> <id_bot>`')
            .setColor('#ff9900');

        return message.channel.send({ embeds: [embedAdm] });
    }

    if (command === 'z.registrar' && isOwner) {
        const [marca, botId] = args;
        if (!marca || !botId) return message.reply("<:not:1539815573981237388> Uso: `z.registrar <marca> <id_do_bot>`");

        await db.set(`bot_${botId}`, { marca: marca.toLowerCase(), botId, guildId: null, expiracao: Date.now(), desligado: false, permanente: false });
        await db.set(`marca_${marca.toLowerCase()}`, botId);
        return message.reply(`<a:ativado:1534611985260609607> Bot vinculado manualmente à marca **${marca.toUpperCase()}**!`);
    }

    if (command === 'z.addtempo' && isOwner) {
        const [marca, opcao] = args;
        if (!marca || !opcao) return message.reply("<:not:1539815573981237388> Uso: `z.addtempo <marca> <dias|1h|60d|perm>`");

        const botIdVinculado = await db.get(`marca_${marca.toLowerCase()}`);
        if (!botIdVinculado) return message.reply("<:not:1539815573981237388> Marca não encontrada!");

        const dadosBot = await db.get(`bot_${botIdVinculado}`);
        const baseTempo = dadosBot.expiracao > Date.now() ? dadosBot.expiracao : Date.now();

        if (opcao.toLowerCase() === 'perm' || opcao.toLowerCase() === 'permanente') {
            dadosBot.permanente = true;
            await db.set(`bot_${botIdVinculado}`, dadosBot);
            return message.reply(`<a:ativado:1534611985260609607> A marca **${marca.toUpperCase()}** agora é **PERMANENTE**!`);
        }

        let msAdicionados = 0;
        let textoConfirmacao = "";

        if (opcao.toLowerCase() === '1h') {
            msAdicionados = 1 * 60 * 60 * 1000;
            textoConfirmacao = "1 hora";
        } else if (opcao.toLowerCase() === '60d') {
            msAdicionados = 60 * 24 * 60 * 60 * 1000;
            textoConfirmacao = "60 dias";
        } else {
            const dias = parseInt(opcao);
            if (isNaN(dias)) return message.reply("<:not:1539815573981237388> Tempo inválido! Use dias, `1h`, `60d` ou `perm`.");
            msAdicionados = dias * 24 * 60 * 60 * 1000;
            textoConfirmacao = `${dias} dias`;
        }

        dadosBot.permanente = false;
        dadosBot.expiracao = baseTempo + msAdicionados;
        await db.set(`bot_${botIdVinculado}`, dadosBot);
        return message.reply(`<a:ativado:1534611985260609607> Adicionado **${textoConfirmacao}** para a marca **${marca.toUpperCase()}**!`);
    }

    if (command === 'z.removertempo' && isOwner) {
        const [marca, diasStr] = args;
        const dias = parseInt(diasStr);
        if (!marca || isNaN(dias)) return message.reply("<:not:1539815573981237388> Uso: `z.removertempo <marca> <dias>`");

        const botIdVinculado = await db.get(`marca_${marca.toLowerCase()}`);
        if (!botIdVinculado) return message.reply("<:not:1539815573981237388> Marca não encontrada!");

        const dadosBot = await db.get(`bot_${botIdVinculado}`);
        const msRemovidos = dias * 24 * 60 * 60 * 1000;

        dadosBot.permanente = false;
        dadosBot.expiracao = Math.max(Date.now(), dadosBot.expiracao - msRemovidos);
        await db.set(`bot_${botIdVinculado}`, dadosBot);
        return message.reply(`<a:ativado:1534611985260609607> Removidos **${dias} dias** da marca **${marca.toUpperCase()}**!`);
    }

    // ==========================================
    // 2. PAINEL PÚBLICO DO CLIENTE
    // ==========================================
    if (command === 'z.painel') {
        const embedSetup = new EmbedBuilder()
            .setTitle('<:config:1534611990633250937> Gerenciamento')
            .setDescription('Aqui você pode gerenciar completamente o seu bot.\nVocê pode Ligar e Desligar o seu bot.\nInicie o gerenciamento clicando em Gerenciar bot')
            .setColor('#2b2d31');

        const btnGerenciar = new ButtonBuilder()
            .setCustomId('btn_abrir_gerenciador')
            .setLabel('Gerenciar bot')
            .setEmoji('1540870215640809482')
            .setStyle(ButtonStyle.Secondary);

        return message.channel.send({ embeds: [embedSetup], components: [new ActionRowBuilder().addComponents(btnGerenciar)] });
    }

    // ==========================================
    // 3. TRAVAS DE SEGURANÇA E EXPIRAÇÃO
    // ==========================================
    if (!message.guild) return;
    const botData = await db.get(`bot_${client.user.id}`);
    if (!botData) return;

    if (botData.guildId && message.guild.id !== botData.guildId) return;

    const ehPermanente = botData.permanente || false;
    const expirado = !ehPermanente && (Date.now() > botData.expiracao);

    if ((expirado || botData.desligado) && !isOwner) {
        const embedExpirado = new EmbedBuilder()
            .setTitle('<:avisos:1539125781320433724> Sistema Expirado / Desligado')
            .setDescription('O período deste bot expirou ou ele foi desativado pelo painel.\n\nAbra um ticket para renovar a assinatura.')
            .setColor('#ff3333');

        const btnSuporte = new ButtonBuilder()
            .setLabel('Abrir Ticket / Suporte')
            .setEmoji('1539845832004870154')
            .setStyle(ButtonStyle.Link)
            .setUrl(LINK_SUPORTE);

        return message.reply({ embeds: [embedExpirado], components: [new ActionRowBuilder().addComponents(btnSuporte)] });
    }

    if (command === '!ping') {
        return message.reply('Pong!');
    }
});

// ==========================================
// 4. INTERAÇÕES DE BOTÕES
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const botData = await db.get(`bot_${client.user.id}`);

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

        const statusEmoji = (expirado || estaDesligado) ? '<a:desativado:1534611986539876463> Desligado' : '<a:ativado:1534611985260609607> Ativo';

        const embedPainel = new EmbedBuilder()
            .setTitle(`<:config:1534611990633250937> Gerenciamento do ${botData?.marca?.toUpperCase() || 'BOT'}`)
            .addFields({
                name: '<:zyphor:1540096483276095621> Informações',
                value: 
                `<:ID:1534611999085039786> **Nome do bot:** ${botData?.marca?.toUpperCase() || 'BOT'}\n` +
                `<:horrio:1534611997335883886> **Tempo restante:** ${textoTempo}\n` +
                `<:perfil:1540557352602705990> **Status:** ${statusEmoji}\n` +
                `<:user:1539125800907968603> **Dono/Posse:** <@${interaction.user.id}>`
            })
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_toggle_desligar')
                .setLabel(estaDesligado ? 'Ligar Bot' : 'Desligar Bot')
                .setEmoji(estaDesligado ? '1534611985260609607' : '1534611986539876463')
                .setStyle(estaDesligado ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('btn_mudar_servidor')
                .setLabel('Vincular Servidor')
                .setEmoji('1539124690709385330')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embedPainel], components: [row], ephemeral: true });
    }

    if (interaction.customId === 'btn_toggle_desligar') {
        botData.desligado = !botData.desligado;
        await db.set(`bot_${client.user.id}`, botData);
        return interaction.update({ content: `<a:ativado:1534611985260609607> O bot foi **${botData.desligado ? 'desligado' : 'ligado'}** com sucesso!`, components: [] });
    }

    if (interaction.customId === 'btn_mudar_servidor') {
        botData.guildId = interaction.guild.id;
        await db.set(`bot_${client.user.id}`, botData);
        return interaction.reply({ content: `<a:ativado:1534611985260609607> Servidor atual vinculado com sucesso!`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
