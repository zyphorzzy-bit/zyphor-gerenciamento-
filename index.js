const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// -------------------------------------------------------------
// 1. CONFIGURAÇÕES E BANCO DE DADOS (SUPABASE)
// -------------------------------------------------------------
const SUPABASE_URL = 'https://mwbmwrrzwiobrpeiwvae.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1sq2Yrw5-uZGX8ekrlY1vw_VHskga7q';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Lista de Owners do Sistema
const OWNERS_IDS = [
    "1521362851502227588", 
    "1533306874513068093"
];

// IDs dos Servidores
const CONFIG_SERVIDORES = {
    vendasGuildId: "1540042508073967767", // Servidor de Vendas (z.painel público)
    admGuildId: "1534610574053474466"      // Servidor ADM (z.painel-adm restrito)
};

const BOT_GERENCIADOR_ID = "1539127568144404483";

// -------------------------------------------------------------
// 2. SISTEMA DE EMOJIS CUSTOMIZADOS
// -------------------------------------------------------------
const e = {
    // Emojis Estáticos
    id: "<:ID:1534611999085039786>",
    alerta: "<:alerta:1534611993410015456>",
    proibido: "<:Proibido:1534611991929290877>",
    config: "<:config:1534611990633250937>",
    horario: "<:horrio:1534611997335883886>",
    perfil: "<:perfil:1540557352602705990>",
    fixo: "<:fixo:1541318082574684240>",
    suporte: "<:suporte:1539845832004870154>",
    gerenciar: "<:gerenciar:1540870215640809482>",
    setaEsq: "<:setaladoe:1539124867113295898>",
    setaDir: "<:setaladod:1539124868727963651>",
    verde: "<:verde:1540096479501357137>",
    vermelho: "<:vermelho:1540096477689290842>",
    amarelo: "<:amarelo:1540096480998596741>",
    zyphor: "<:zyphor:1540096483276095621>",
    sms: "<:sms:1539125782335455292>",
    apagado: "<:apagado:1539124689077665894>",
    linkExterno: "<:linkexterno:1539124690709385330>",

    // Emojis Animados
    ativado: "<a:ativado:1534611985260609607>",
    desativado: "<a:desativado:1534611986539876463>",
    loading: "<a:loanding:1534612861211377868>"
};

// -------------------------------------------------------------
// 3. INICIALIZAÇÃO DO BOT E STATUS DE STREAM
// -------------------------------------------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('ready', () => {
    console.log(`✅ System Online: Logado como ${client.user.tag}`);

    // Status Transmitindo
    client.user.setPresence({
        activities: [{
            name: 'Zyphor Manager ⚙️',
            type: 1, // 1 = Streaming
            url: 'https://www.twitch.tv/discord'
        }],
        status: 'online'
    });
});

// -------------------------------------------------------------
// 4. COMANDOS DE TEXTO (z.painel e z.painel-adm)
// -------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = "z.";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- COMANDO Z.PAINEL (Servidor de Vendas) ---
    if (command === 'painel') {
        if (message.guild.id !== CONFIG_SERVIDORES.vendasGuildId) {
            return message.reply(`${e.proibido} Este comando só pode ser usado no **Servidor de Vendas**!`);
        }

        const embed = new EmbedBuilder()
            .setTitle(`${e.zyphor} Gerenciamento de Bots & Licenças`)
            .setDescription(`${e.config} Clique no botão abaixo para abrir o seu painel de controle e gerenciar suas licenças de bot.`)
            .setColor("#2b2d31")
            .setFooter({ text: "Zyphor System", iconURL: client.user.displayAvatarURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_painel_cliente')
                .setLabel('Gerenciar Meu Bot')
                .setEmoji('1540870215640809482')
                .setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    // --- COMANDO Z.PAINEL-ADM (Servidor ADM Restrito) ---
    if (command === 'painel-adm') {
        if (message.guild.id !== CONFIG_SERVIDORES.admGuildId) {
            return message.reply(`${e.proibido} Este comando é exclusivo do **Servidor de Administração**!`);
        }

        if (!OWNERS_IDS.includes(message.author.id)) {
            return message.reply(`${e.proibido} Apenas os Owners cadastrados têm acesso a este painel.`);
        }

        const embed = new EmbedBuilder()
            .setTitle(`${e.config} Painel Administrativo`)
            .setDescription(`${e.alerta} Selecione uma ação para gerenciar clientes ou licenças no banco de dados.`)
            .setColor("#ff0000");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('adm_registrar_bot')
                .setLabel('Registrar Bot')
                .setEmoji('1540096479501357137')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('adm_gerenciar_tempo')
                .setLabel('Modificar Licença')
                .setEmoji('1534611997335883886')
                .setStyle(ButtonStyle.Secondary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
});

// -------------------------------------------------------------
// 5. INTERAÇÕES DE BOTÕES E TRAVA DE SEGURANÇA
// -------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // --- BOTÃO CLIENTE ---
    if (interaction.customId === 'abrir_painel_cliente') {
        const { data: botsCliente, error } = await supabase
            .from('bots')
            .select('*')
            .eq('dono_id', interaction.user.id);

        if (error || !botsCliente || botsCliente.length === 0) {
            return interaction.reply({
                content: `${e.alerta} Nenhuma licença de bot encontrada para a sua conta.`,
                ephemeral: true
            });
        }

        const botAtual = botsCliente[0];
        const tempoRestanteMs = Number(botAtual.expiracao || 0) - Date.now();
        const diasRestantes = Math.max(0, Math.floor(tempoRestanteMs / (1000 * 60 * 60 * 24)));
        const statusIcon = botAtual.desligado ? e.desativado : e.ativado;

        const embed = new EmbedBuilder()
            .setTitle(`${e.perfil} Painel da Licença: ${botAtual.marca}`)
            .addFields(
                { name: `${e.config} Status`, value: `${statusIcon} ${botAtual.desligado ? "Desligado" : "Ativo"}`, inline: true },
                { name: `${e.horario} Expiração`, value: botAtual.permanente ? `${e.fixo} Permanente` : `${diasRestantes} dias`, inline: true },
                { name: `${e.id} Servidor Autorizado`, value: botAtual.guild_id ? `\`${botAtual.guild_id}\`` : "Nenhum vinculado", inline: false }
            )
            .setColor(botAtual.desligado ? "#ff0000" : "#00ff00");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`vincular_guild_${botAtual.id}`)
                .setLabel('Vincular Servidor Atual')
                .setEmoji('1541318082574684240')
                .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // --- TRAVA ADM ---
    if (interaction.customId.startsWith('adm_')) {
        if (interaction.guild.id !== CONFIG_SERVIDORES.admGuildId || !OWNERS_IDS.includes(interaction.user.id)) {
            return interaction.reply({
                content: `${e.proibido} Ação não autorizada! Apenas Owners no servidor ADM podem executar.`,
                ephemeral: true
            });
        }
    }
});

// -------------------------------------------------------------
// 6. LOGIN DO BOT
// -------------------------------------------------------------
client.login('SEU_DISCORD_BOT_TOKEN_AQUI');
