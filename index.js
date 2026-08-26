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
    ActivityType
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// -------------------------------------------------------------
// 1. CONFIGURAÇÕES E SUPABASE
// -------------------------------------------------------------
const SUPABASE_URL = 'https://mwbmwrrzwiobrpeiwvae.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1sq2Yrw5-uZGX8ekrlY1vw_VHskga7q';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OWNERS_IDS = ["1521362851502227588", "1533306874513068093"];
const ID_CANAL_TOPICOS_CLIENTES = "1534610574053474466"; 

let configGeral = {
    msgExpiracao: "Sua licença do bot expirou! Entre no nosso servidor de suporte para realizar a renovação.",
    linkSuporte: "https://discord.gg/seu-servidor-suporte",
    linkOAuth2: "https://discord.com/oauth2/authorize?client_id=SEU_CLIENT_ID&permissions=8&scope=bot"
};

const e = {
    full: {
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
    },
    id: {
        id: "1534611999085039786",
        alerta: "1534611993410015456",
        proibido: "1534611991929290877",
        config: "1534610574053474466",
        verde: "1540096479501357137",
        vermelho: "1540096477689290842",
        zyphor: "1540096483276095621",
        perfil: "1540557352602705990",
        setaE: "1534611985260609607",
        setaD: "1534611986539876463"
    }
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// -------------------------------------------------------------
// VERIFICAÇÃO AUTOMÁTICA DE LICENÇAS EXPIRADAS
// -------------------------------------------------------------
async function checarEBloquearExpirados() {
    try {
        const { data: bots } = await supabase.from('bots').select('*');
        if (!bots) return;

        const agora = Date.now();
        for (const bot of bots) {
            if (!bot.permanente && bot.expiracao > 0 && agora >= Number(bot.expiracao) && !bot.desligado) {
                await supabase.from('bots').update({ desligado: true }).eq('id', bot.id);
                console.log(`[LICENÇA] Bot da marca ${bot.marca} (${bot.dono_id}) foi desativado por expiração.`);
                await sincronizarTopicoCliente({ ...bot, desligado: true });
            }
        }
    } catch (err) {
        console.error("Erro no loop de expiração:", err);
    }
}

// -------------------------------------------------------------
// SISTEMA DE PRESENÇA E INICIALIZAÇÃO
// -------------------------------------------------------------
client.once('ready', () => {
    console.log(`[ONLINE] Bot de Gerenciamento conectado como ${client.user.tag}`);

    client.user.setPresence({
        activities: [{
            name: 'Zyphor System • Gerenciamento',
            type: ActivityType.Streaming,
            url: 'https://www.twitch.tv/discord'
        }],
        status: 'online'
    });

    // Roda a checagem ao ligar e a cada 60 segundos
    checarEBloquearExpirados();
    setInterval(checarEBloquearExpirados, 60 * 1000);
});

// -------------------------------------------------------------
// LOGS E SINCRONIZAÇÃO DE TÓPICOS
// -------------------------------------------------------------
async function sincronizarTopicoCliente(botDados) {
    try {
        const canal = await client.channels.fetch(ID_CANAL_TOPICOS_CLIENTES);
        if (!canal) return null;

        const statusTag = botDados.desligado ? "🔴 [EXPIRADO/DESLIGADO]" : "🟢 [ATIVO]";
        const nomeTopico = `${statusTag} ${botDados.marca} | ${botDados.tipo_bot || 'Z-01'}`;

        const embedTopico = new EmbedBuilder()
            .setAuthor({ name: "Zyphor System • Registro de Licença", iconURL: client.user.displayAvatarURL() })
            .setTitle(`${e.full.zyphor} Bot: ${botDados.marca}`)
            .addFields(
                { name: `${e.full.id} Proprietário`, value: `<@${botDados.dono_id}>\n\`${botDados.dono_id}\``, inline: true },
                { name: `${e.full.config} Tipo`, value: `\`\`\`${botDados.tipo_bot || 'Z-01'}\`\`\``, inline: true },
                { name: `${e.full.horario} Expiração`, value: botDados.permanente ? `${e.full.fixo} **Vitalícia**` : `<t:${Math.floor(Number(botDados.expiracao) / 1000)}:R>`, inline: true }
            )
            .setColor(botDados.desligado ? "#ff4d4d" : "#57f287")
            .setTimestamp();

        if (botDados.thread_id) {
            try {
                const threadExistente = await canal.threads.fetch(botDados.thread_id);
                if (threadExistente) {
                    await threadExistente.setName(nomeTopico);
                    await threadExistente.send({ embeds: [embedTopico] });
                    return threadExistente.id;
                }
            } catch (err) {}
        }

        const novoTopico = await canal.threads.create({
            name: nomeTopico,
            autoArchiveDuration: 10080,
            reason: `Licença atualizada para: ${botDados.marca}`
        });

        await novoTopico.send({ embeds: [embedTopico] });
        return novoTopico.id;
    } catch (error) {
        console.error("Erro ao gerenciar tópico:", error);
        return null;
    }
}

async function obterEstatisticasBots() {
    const { data: bots } = await supabase.from('bots').select('*');
    if (!bots) return { ativos: 0, expirados: 0, totalMarcas: 0 };
    return {
        ativos: bots.filter(b => !b.desligado).length,
        expirados: bots.filter(b => b.desligado).length,
        totalMarcas: new Set(bots.map(b => b.marca)).size
    };
}

function gerarPainelCliente(bots, index, userId) {
    const botAtual = bots[index];
    const totalBots = bots.length;

    const tempoRestanteMs = Number(botAtual.expiracao || 0) - Date.now();
    const diasRestantes = Math.max(0, Math.floor(tempoRestanteMs / (1000 * 60 * 60 * 24)));
    const statusIcon = botAtual.desligado ? e.full.desativado : e.full.ativado;

    const embed = new EmbedBuilder()
        .setAuthor({ name: "Central de Licenças • Zyphor System", iconURL: client.user.displayAvatarURL() })
        .setTitle(`${e.full.perfil} Gerenciamento da Licença`)
        .setDescription(`>>> *Navegue pelas suas licenças ativas e configure seu bot em tempo real.*\n\n**Navegação:** Licença \`${index + 1}\` de \`${totalBots}\`\n---`)
        .addFields(
            { name: `${e.full.zyphor} Marca`, value: `\`\`\`${botAtual.marca}\`\`\``, inline: true },
            { name: `${e.full.config} Modelo`, value: `\`\`\`${botAtual.tipo_bot || 'Z-01'}\`\`\``, inline: true },
            { name: `${e.full.alerta} Status`, value: `${statusIcon} **${botAtual.desligado ? "Expirado / Travar" : "Ativo"}**`, inline: true },
            { name: `${e.full.horario} Tempo Restante`, value: botAtual.permanente ? `${e.full.fixo} **Vitalício**` : `\`${diasRestantes} Dias\``, inline: true }
        )
        .setColor(botAtual.desligado ? "#ff4d4d" : "#57f287")
        .setFooter({ text: "Zyphor System • Clique nos botões abaixo para interagir" });

    const urlOAuth2 = botAtual.bot_client_id 
        ? `https://discord.com/oauth2/authorize?client_id=${botAtual.bot_client_id}&permissions=8&scope=bot`
        : configGeral.linkOAuth2;

    const rowLinks = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Adicionar Bot')
            .setURL(urlOAuth2)
            .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
            .setLabel('Suporte')
            .setURL(configGeral.linkSuporte)
            .setStyle(ButtonStyle.Link)
    );

    const rowNavegacao = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`painel_prev_${userId}_${index}`)
            .setEmoji(e.id.setaE)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === 0),
        new ButtonBuilder()
            .setCustomId('painel_contador')
            .setLabel(`${index + 1}/${totalBots}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`painel_next_${userId}_${index}`)
            .setEmoji(e.id.setaD)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(index === totalBots - 1)
    );

    return { embeds: [embed], components: totalBots > 1 ? [rowLinks, rowNavegacao] : [rowLinks] };
}

// -------------------------------------------------------------
// MENSAGENS / COMANDOS
// -------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = "z.";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'painel') {
        const embed = new EmbedBuilder()
            .setAuthor({ name: "Zyphor System • Atendimento", iconURL: message.guild.iconURL() })
            .setTitle(`${e.full.zyphor} Gerenciamento de Licenças`)
            .setDescription(`>>> *Bem-vindo ao centro de atendimento e gerenciamento de aplicações.*\n\nClique no botão abaixo para abrir seu painel de controle individual.`)
            .setColor("#2b2d31");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_painel_cliente')
                .setLabel('Acessar Meus Bots')
                .setEmoji(e.id.perfil)
                .setStyle(ButtonStyle.Success)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    if (command === 'painel-adm' || command === 'config') {
        if (!OWNERS_IDS.includes(message.author.id)) {
            return message.reply(`${e.full.proibido} Acesso negado.`);
        }

        const stats = await obterEstatisticasBots();

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Zyphor Management • Painel Geral", iconURL: client.user.displayAvatarURL() })
            .setTitle(`${e.full.config} Painel Administrativo`)
            .setDescription(`${e.full.alerta} *Gerenciamento central de licenças e controle de travas.*\n\u200b`)
            .addFields(
                { name: `${e.full.verde} Ativos`, value: `\`\`\`\n${stats.ativos}\`\`\``, inline: true },
                { name: `${e.full.vermelho} Expirados / Desligados`, value: `\`\`\`\n${stats.expirados}\`\`\``, inline: true },
                { name: `${e.full.zyphor} Marcas`, value: `\`\`\`\n${stats.totalMarcas}\`\`\``, inline: true }
            )
            .setColor("#ff4d4d");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_add_bot')
                .setLabel('Adicionar Bot')
                .setEmoji(e.id.verde)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('btn_toggle_status')
                .setLabel('Ativar / Travar Bot')
                .setEmoji(e.id.alerta)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('btn_renew_bot')
                .setLabel('Renovar Licença')
                .setEmoji(e.id.config)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('btn_remove_bot')
                .setLabel('Remover Licença')
                .setEmoji(e.id.vermelho)
                .setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
});

// -------------------------------------------------------------
// EVENTOS DE INTERAÇÃO (BOTOES E MODAIS ADM E CLIENTE)
// -------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'abrir_painel_cliente') {
            const { data: botsCliente } = await supabase
                .from('bots')
                .select('*')
                .eq('dono_id', interaction.user.id);

            if (!botsCliente || botsCliente.length === 0) {
                return interaction.reply({
                    content: `${e.full.alerta} Você não possui nenhuma licença ativa vinculada a esta conta.`,
                    ephemeral: true
                });
            }

            const painelDados = gerarPainelCliente(botsCliente, 0, interaction.user.id);
            return interaction.reply({ ...painelDados, ephemeral: true });
        }

        if (interaction.customId === 'btn_add_bot') {
            const modal = new ModalBuilder()
                .setCustomId('modal_add_bot')
                .setTitle('Adicionar Nova Licença');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('dono_id').setLabel('ID do Cliente').setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('bot_client_id').setLabel('ID da Aplicação (Bot Client ID)').setStyle(TextInputStyle.Short).setPlaceholder('Obrigatório para travar o bot').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('marca').setLabel('Nome da Marca/Bot').setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('tipo').setLabel('Tipo (Ex: Z-01, Vendas)').setStyle(TextInputStyle.Short).setValue('Z-01').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('dias').setLabel('Dias de Validade (0 = Permanente)').setStyle(TextInputStyle.Short).setValue('30').setRequired(true)
                )
            );

            return await interaction.showModal(modal);
        }

        if (interaction.customId === 'btn_toggle_status') {
            const modal = new ModalBuilder()
                .setCustomId('modal_toggle_status')
                .setTitle('Ativar ou Travar Bot');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('bot_id_input')
                        .setLabel('ID do Bot Client ou ID do Cliente')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            return await interaction.showModal(modal);
        }

        if (interaction.customId === 'btn_renew_bot') {
            const modal = new ModalBuilder()
                .setCustomId('modal_renew_bot')
                .setTitle('Renovar Licença');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('bot_id_renew').setLabel('ID do Bot Client ou ID do Cliente').setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('dias_adicionar').setLabel('Adicionar Quantos Dias?').setStyle(TextInputStyle.Short).setValue('30').setRequired(true)
                )
            );

            return await interaction.showModal(modal);
        }

        if (interaction.customId === 'btn_remove_bot') {
            const modal = new ModalBuilder()
                .setCustomId('modal_remove_bot')
                .setTitle('Remover Bot/Licença');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('bot_id_remove')
                        .setLabel('ID do Bot Client ou ID do Cliente')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            return await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith('painel_prev_') || interaction.customId.startsWith('painel_next_')) {
            const parts = interaction.customId.split('_');
            const action = parts[1];
            const ownerId = parts[2];
            let currentIndex = parseInt(parts[3]);

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: `${e.full.proibido} Você não tem permissão para usar estes controles.`, ephemeral: true });
            }

            const { data: botsCliente } = await supabase.from('bots').select('*').eq('dono_id', ownerId);
            if (!botsCliente || botsCliente.length === 0) return;

            if (action === 'prev' && currentIndex > 0) currentIndex--;
            else if (action === 'next' && currentIndex < botsCliente.length - 1) currentIndex++;

            const painelAtualizado = gerarPainelCliente(botsCliente, currentIndex, ownerId);
            return interaction.update(painelAtualizado);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_add_bot') {
            await interaction.deferReply({ ephemeral: true });

            const donoId = interaction.fields.getTextInputValue('dono_id').trim();
            const botClientId = interaction.fields.getTextInputValue('bot_client_id').trim();
            const marca = interaction.fields.getTextInputValue('marca').trim();
            const tipo = interaction.fields.getTextInputValue('tipo').trim() || 'Z-01';
            const diasInput = interaction.fields.getTextInputValue('dias').trim();
            
            const dias = parseInt(diasInput) || 0;
            const permanente = dias === 0;
            const expiracao = permanente ? 0 : Date.now() + (dias * 24 * 60 * 60 * 1000);

            const { data: novoBot, error } = await supabase.from('bots').insert([{
                dono_id: donoId,
                bot_client_id: botClientId,
                marca: marca,
                tipo_bot: tipo,
                expiracao: expiracao,
                permanente: permanente,
                desligado: false
            }]).select().single();

            if (error) {
                return interaction.editReply(`${e.full.proibido} **Erro ao salvar no Supabase:** ${error.message}`);
            }

            const threadId = await sincronizarTopicoCliente(novoBot);
            if (threadId) {
                await supabase.from('bots').update({ thread_id: threadId }).eq('id', novoBot.id);
            }

            return interaction.editReply({
                content: `${e.full.verde} **Licença cadastrada e ativa!**\n> **Cliente:** <@${donoId}>\n> **Bot Client ID:** \`${botClientId}\`\n> **Validade:** ${permanente ? 'Vitalícia' : `\`${dias} Dias\``}`
            });
        }

        if (interaction.customId === 'modal_toggle_status') {
            await interaction.deferReply({ ephemeral: true });
            const botIdInput = interaction.fields.getTextInputValue('bot_id_input').trim();

            const { data: botList } = await supabase
                .from('bots')
                .select('*')
                .or(`bot_client_id.eq.${botIdInput},dono_id.eq.${botIdInput}`);

            if (!botList || botList.length === 0) {
                return interaction.editReply(`${e.full.proibido} Nenhum bot localizado.`);
            }

            const bot = botList[0];
            const novoStatus = !bot.desligado;

            await supabase.from('bots').update({ desligado: novoStatus }).eq('id', bot.id);
            await sincronizarTopicoCliente({ ...bot, desligado: novoStatus });

            const msgStatus = novoStatus 
                ? `${e.full.vermelho} **O bot foi TRAVADO/DESLIGADO!** As funções foram bloqueadas.` 
                : `${e.full.verde} **O bot foi DESBLOQUEADO/ATIVADO!**`;

            return interaction.editReply(msgStatus);
        }

        if (interaction.customId === 'modal_renew_bot') {
            await interaction.deferReply({ ephemeral: true });
            const botIdInput = interaction.fields.getTextInputValue('bot_id_renew').trim();
            const diasAdicionar = parseInt(interaction.fields.getTextInputValue('dias_adicionar').trim()) || 30;

            const { data: botList } = await supabase
                .from('bots')
                .select('*')
                .or(`bot_client_id.eq.${botIdInput},dono_id.eq.${botIdInput}`);

            if (!botList || botList.length === 0) {
                return interaction.editReply(`${e.full.proibido} Bot não encontrado.`);
            }

            const bot = botList[0];
            const novaExpiracao = Date.now() + (diasAdicionar * 24 * 60 * 60 * 1000);

            await supabase.from('bots').update({
                expiracao: novaExpiracao,
                permanente: false,
                desligado: false
            }).eq('id', bot.id);

            await sincronizarTopicoCliente({ ...bot, expiracao: novaExpiracao, desligado: false, permanente: false });

            return interaction.editReply(`${e.full.verde} **Licença renovada por mais ${diasAdicionar} dias!** O bot foi reativado no sistema.`);
        }

        if (interaction.customId === 'modal_remove_bot') {
            await interaction.deferReply({ ephemeral: true });
            const idBusca = interaction.fields.getTextInputValue('bot_id_remove').trim();

            const { data: botsEncontrados } = await supabase
                .from('bots')
                .select('*')
                .or(`bot_client_id.eq.${idBusca},dono_id.eq.${idBusca}`);

            if (!botsEncontrados || botsEncontrados.length === 0) {
                return interaction.editReply(`${e.full.proibido} Nenhuma licença foi encontrada com o ID informado.`);
            }

            await supabase.from('bots').delete().or(`bot_client_id.eq.${idBusca},dono_id.eq.${idBusca}`);

            return interaction.editReply(`${e.full.verde} Foram removidas **${botsEncontrados.length}** licença(s) do banco de dados.`);
        }
    }
});

const BOT_TOKEN = process.env.DISCORD_TOKEN || 'SEU_TOKEN_AQUI';
client.login(BOT_TOKEN);
