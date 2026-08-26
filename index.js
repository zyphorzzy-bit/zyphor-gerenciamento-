const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// -------------------------------------------------------------
// 1. CONFIGURAÇÕES E BANCO DE DADOS (SUPABASE)
// -------------------------------------------------------------
const SUPABASE_URL = 'https://mwbmwrrzwiobrpeiwvae.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1sq2Yrw5-uZGX8ekrlY1vw_VHskga7q';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OWNERS_IDS = [
    "1521362851502227588", 
    "1533306874513068093"
];

const CONFIG_SERVIDORES = {
    vendasGuildId: "1540042508073967767",
    admGuildId: "1534610574053474466"
};

// ID DO CANAL ONDE SERÃO CRIADOS OS TÓPICOS DOS CLIENTES
const ID_CANAL_TOPICOS_CLIENTES = "1534610574053474466"; 

let configGeral = {
    msgExpiracao: "Sua licença do bot expirou! Entre no nosso servidor de suporte para realizar a renovação.",
    linkSuporte: "https://discord.gg/seu-servidor-suporte",
    linkOAuth2: "https://discord.com/oauth2/authorize?client_id=SEU_CLIENT_ID&permissions=8&scope=bot"
};

const e = {
    id: "<:ID:1534611999085039786>",
    alerta: "<:alerta:1534611993410015456>",
    proibido: "<:Proibido:1534611991929290877>",
    config: "<:config:1534611990633250937>",
    horario: "<:horrio:1534611997335883886>",
    perfil: "<:perfil:1540557352602705990>",
    fixo: "<:fixo:1541318082574684240>",
    verde: "<:verde:1540096479501357137>",
    vermelho: "<:vermelho:1540096477689290842>",
    zyphor: "<:zyphor:1540096483276095621>",
    ativado: "<a:ativado:1534611985260609607>",
    desativado: "<a:desativado:1534611986539876463>"
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// -------------------------------------------------------------
// FUNÇÃO PARA CRIAR OU ATUALIZAR O TÓPICO DO CLIENTE
// -------------------------------------------------------------
async function atualizarTopicoCliente(botDados, expirado = false) {
    try {
        const canal = await client.channels.fetch(ID_CANAL_TOPICOS_CLIENTES);
        if (!canal) return;

        const statusTexto = expirado ? "🔴 [EXPIRADO]" : "🟢 [ATIVO]";
        const nomeTopico = `${statusTexto} ${botDados.marca} - ${botDados.tipo_bot || 'Z-01'}`;

        const embedTopico = new EmbedBuilder()
            .setTitle(`📌 Ficha da Licença - ${botDados.marca}`)
            .addFields(
                { name: "👤 Cliente", value: `<@${botDados.dono_id}> (\`${botDados.dono_id}\`)`, inline: true },
                { name: "🏷️ Marca do Bot", value: `\`${botDados.marca}\``, inline: true },
                { name: "🤖 Tipo de Bot", value: `\`${botDados.tipo_bot || 'Z-01'}\``, inline: true },
                { name: "⚙️ Status", value: expirado ? "🔴 **EXPIRADO / DESLIGADO**" : "🟢 **ATIVO**", inline: true },
                { name: "⏳ Expiração", value: botDados.permanente ? "Permanente" : `<t:${Math.floor(Number(botDados.expiracao)/1000)}:R>`, inline: true }
            )
            .setColor(expirado ? "#ff0000" : "#00ff00")
            .setTimestamp();

        // Se já houver um tópico salvo no banco, atualiza ele
        if (botDados.thread_id) {
            try {
                const threadExistente = await canal.threads.fetch(botDados.thread_id);
                if (threadExistente) {
                    await threadExistente.setName(nomeTopico);
                    await threadExistente.send({ embeds: [embedTopico] });
                    return;
                }
            } catch (err) {
                console.log("Tópico antigo não encontrado, criando um novo...");
            }
        }

        // Se não existir, cria um tópico novo
        const novoTopico = await canal.threads.create({
            name: nomeTopico,
            autoArchiveDuration: 10080, // Mantém aberto por até 7 dias sem interações
            reason: `Tópico de gerenciamento da licença de ${botDados.marca}`
        });

        await novoTopico.send({ embeds: [embedTopico] });

        // Salva o ID do tópico no Supabase para futuras atualizações
        await supabase.from('bots').update({ thread_id: novoTopico.id }).eq('id', botDados.id);

    } catch (error) {
        console.error("Erro ao gerenciar tópico do cliente:", error);
    }
}

// -------------------------------------------------------------
// CHECAGEM DE EXPIRAÇÃO AUTOMÁTICA
// -------------------------------------------------------------
async function checarExpiracoes() {
    const { data: bots } = await supabase.from('bots').select('*');
    if (!bots) return;

    const agora = Date.now();

    for (const bot of bots) {
        if (bot.permanente || bot.desligado || !bot.expiracao) continue;

        if (agora >= Number(bot.expiracao)) {
            // Atualiza status no banco
            await supabase.from('bots').update({ desligado: true }).eq('id', bot.id);

            // Atualiza a ficha no Tópico do Cliente
            await atualizarTopicoCliente(bot, true);

            // Avisa no privado do Cliente
            try {
                const cliente = await client.users.fetch(bot.dono_id);
                if (cliente) {
                    const embedDM = new EmbedBuilder()
                        .setTitle(`${e.alerta} Sua Licença Expirou!`)
                        .setDescription(`${configGeral.msgExpiracao}\n\n**Bot:** \`${bot.marca}\``)
                        .setColor("#ff0000");

                    const rowDM = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Renovar no Suporte')
                            .setURL(configGeral.linkSuporte)
                            .setStyle(ButtonStyle.Link)
                    );

                    await cliente.send({ embeds: [embedDM], components: [rowDM] });
                }
            } catch (e) {}
        }
    }
}

client.on('ready', () => {
    console.log(`✅ System Online: Logado como ${client.user.tag}`);
    setInterval(checarExpiracoes, 3600000);
});

// -------------------------------------------------------------
// COMANDOS E MODAIS
// -------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = "z.";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'config') {
        if (message.guild.id !== CONFIG_SERVIDORES.admGuildId || !OWNERS_IDS.includes(message.author.id)) return;

        const embed = new EmbedBuilder()
            .setTitle(`${e.config} Configurações Gerais`)
            .addFields(
                { name: "Mensagem de Expiração (DM)", value: `\`\`\`${configGeral.msgExpiracao}\`\`\`` },
                { name: "Link do Suporte", value: `\`\`\`${configGeral.linkSuporte}\`\`\`` },
                { name: "Link OAuth2", value: `\`\`\`${configGeral.linkOAuth2}\`\`\`` }
            )
            .setColor("#2b2d31");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_abrir_config_modal')
                .setLabel('Editar Ajustes')
                .setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_registrar_bot') {
            const donoId = interaction.fields.getTextInputValue('input_dono_id').trim();
            const marca = interaction.fields.getTextInputValue('input_marca').trim();
            const tipoBot = interaction.fields.getTextInputValue('input_tipo_bot') || 'Z-01';
            const dias = parseInt(interaction.fields.getTextInputValue('input_dias').trim());

            const ePermanente = dias === 0;
            const expiracaoTimestamp = ePermanente ? 0 : Date.now() + (dias * 24 * 60 * 60 * 1000);

            const { data, error } = await supabase.from('bots').insert([
                {
                    dono_id: donoId,
                    marca: marca,
                    tipo_bot: tipoBot,
                    expiracao: expiracaoTimestamp,
                    permanente: ePermanente,
                    desligado: false
                }
            ]).select();

            if (error) return interaction.reply({ content: `${e.alerta} Erro ao registrar!`, ephemeral: true });

            // Cria o tópico no canal do ADM
            await atualizarTopicoCliente(data[0], false);

            return interaction.reply({ content: `${e.verde} Bot **${marca}** registrado e tópico criado!`, ephemeral: true });
        }
    }
});

const BOT_TOKEN = process.env.DISCORD_TOKEN || 'SEU_TOKEN_AQUI';
client.login(BOT_TOKEN);
