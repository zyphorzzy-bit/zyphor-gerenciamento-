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

const ID_CANAL_TOPICOS_CLIENTES = "1534610574053474466"; 

let configGeral = {
    msgExpiracao: "Sua licença do bot expirou! Entre no nosso servidor de suporte para realizar a renovação.",
    linkSuporte: "https://discord.gg/seu-servidor-suporte",
    linkOAuth2: "https://discord.com/oauth2/authorize?client_id=SEU_CLIENT_ID&permissions=8&scope=bot"
};

// -------------------------------------------------------------
// 2. EMOJIS CUSTOMIZADOS
// -------------------------------------------------------------
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
        config: "1534611990633250937",
        horario: "1534611997335883886",
        perfil: "1540557352602705990",
        fixo: "1541318082574684240",
        verde: "1540096479501357137",
        vermelho: "1540096477689290842",
        zyphor: "1540096483276095621",
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
// 3. OBTENÇÃO DE ESTATÍSTICAS GLOBAIS DE BOTS
// -------------------------------------------------------------
async function obterEstatisticasBots() {
    const { data: bots } = await supabase.from('bots').select('*');
    if (!bots) return { ativos: 0, expirados: 0, totalMarcas: 0 };

    const ativos = bots.filter(b => !b.desligado).length;
    const expirados = bots.filter(b => b.desligado).length;
    
    // Filtra marcas únicas registradas
    const marcasUnicas = new Set(bots.map(b => b.marca));

    return {
        ativos,
        expirados,
        totalMarcas: marcasUnicas.size
    };
}

// -------------------------------------------------------------
// 4. ATUALIZAÇÃO DO TÓPICO DO CLIENTE
// -------------------------------------------------------------
async function atualizarTopicoCliente(botDados, statusTipo = "ativo") {
    try {
        const canal = await client.channels.fetch(ID_CANAL_TOPICOS_CLIENTES);
        if (!canal) return;

        let statusTag = "🟢 [ATIVO]";
        let statusTexto = `${e.full.verde} **ATIVO**`;
        let cor = "#00ff00";

        if (statusTipo === "expirado") {
            statusTag = "🔴 [EXPIRADO]";
            statusTexto = `${e.full.vermelho} **EXPIRADO / DESLIGADO**`;
            cor = "#ff0000";
        } else if (statusTipo === "removido_servidor") {
            statusTag = "🚫 [SAIU DO SERVIDOR]";
            statusTexto = `${e.full.proibido} **SAIU DO SERVIDOR (2 DIAS EXPIRADO)**`;
            cor = "#2b2d31";
        }

        const nomeTopico = `${statusTag} ${botDados.marca} - ${botDados.tipo_bot || 'Z-01'}`;

        const embedTopico = new EmbedBuilder()
            .setTitle(`${e.full.perfil} Ficha da Licença - ${botDados.marca}`)
            .addFields(
                { name: `${e.full.id} Cliente`, value: `<@${botDados.dono_id}> (\`${botDados.dono_id}\`)`, inline: true },
                { name: `${e.full.zyphor} Marca do Bot`, value: `\`${botDados.marca}\``, inline: true },
                { name: `${e.full.config} Tipo de Bot`, value: `\`${botDados.tipo_bot || 'Z-01'}\``, inline: true },
                { name: `${e.full.alerta} Status`, value: statusTexto, inline: true },
                { name: `${e.full.horario} Expiração`, value: botDados.permanente ? `${e.full.fixo} Permanente` : `<t:${Math.floor(Number(botDados.expiracao)/1000)}:R>`, inline: true },
                { name: `${e.full.id} Servidor Vinculado`, value: botDados.guild_id ? `\`${botDados.guild_id}\`` : "Nenhum", inline: true }
            )
            .setColor(cor)
            .setTimestamp();

        if (botDados.thread_id) {
            try {
                const threadExistente = await canal.threads.fetch(botDados.thread_id);
                if (threadExistente) {
                    await threadExistente.setName(nomeTopico);
                    await threadExistente.send({ embeds: [embedTopico] });
                    return;
                }
            } catch (err) {}
        }

        const novoTopico = await canal.threads.create({
            name: nomeTopico,
            autoArchiveDuration: 10080,
            reason: `Tópico do cliente: ${botDados.marca}`
        });

        await novoTopico.send({ embeds: [embedTopico] });
        await supabase.from('bots').update({ thread_id: novoTopico.id }).eq('id', botDados.id);

    } catch (error) {
        console.error("Erro ao gerenciar tópico:", error);
    }
}

// -------------------------------------------------------------
// 5. CHECAGEM DE EXPIRAÇÃO E SAÍDA AUTOMÁTICA (2 DIAS)
// -------------------------------------------------------------
async function checarExpiracoesERemocoes() {
    const { data: bots } = await supabase.from('bots').select('*');
    if (!bots) return;

    const agora = Date.now();
    const doisDiasMs = 2 * 24 * 60 * 60 * 1000; // 48 horas em milissegundos

    for (const bot of bots) {
        if (bot.permanente || !bot.expiracao) continue;

        const dataExpiracao = Number(bot.expiracao);

        // 1. MARCAR COMO EXPIRADO
        if (agora >= dataExpiracao && !bot.desligado) {
            await supabase.from('bots').update({ desligado: true }).eq('id', bot.id);
            await atualizarTopicoCliente(bot, "expirado");

            try {
                const cliente = await client.users.fetch(bot.dono_id);
                if (cliente) {
                    const embedDM = new EmbedBuilder()
                        .setTitle(`${e.full.alerta} Sua Licença Expirou!`)
                        .setDescription(`${configGeral.msgExpiracao}\n\n${e.full.zyphor} **Bot:** \`${bot.marca}\``)
                        .setColor("#ff0000");

                    const rowDM = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Renovar no Suporte')
                            .setURL(configGeral.linkSuporte)
                            .setStyle(ButtonStyle.Link)
                    );

                    await cliente.send({ embeds: [embedDM], components: [rowDM] });
                }
            } catch (err) {}
        }

        // 2. KICK DO SERVIDOR APÓS 2 DIAS DE EXPIRADO
        if (bot.desligado && bot.guild_id && !bot.removido_guild) {
            if (agora >= (dataExpiracao + doisDiasMs)) {
                try {
                    const guild = await client.guilds.fetch(bot.guild_id);
                    if (guild) {
                        await guild.leave(); // Bot sai do servidor do cliente
                        console.log(`Bot saiu do servidor ${bot.guild_id} devido a 2 dias de expiração.`);
                    }
                } catch (err) {
                    console.log(`Servidor ${bot.guild_id} não encontrado ou bot já havia saído.`);
                }

                // Atualiza banco e tópico informando a remoção
                await supabase.from('bots').update({ removido_guild: true }).eq('id', bot.id);
                await atualizarTopicoCliente(bot, "removido_servidor");
            }
        }
    }
}

client.on('ready', () => {
    console.log(`✅ System Online: Logado como ${client.user.tag}`);
    setInterval(checarExpiracoesERemocoes, 3600000);
});

// -------------------------------------------------------------
// 6. GERAÇÃO DO PAINEL CLIENTE (COM NAVEGAÇÃO)
// -------------------------------------------------------------
function gerarPainelCliente(bots, index, userId) {
    const botAtual = bots[index];
    const totalBots = bots.length;

    const tempoRestanteMs = Number(botAtual.expiracao || 0) - Date.now();
    const diasRestantes = Math.max(0, Math.floor(tempoRestanteMs / (1000 * 60 * 60 * 24)));
    const statusIcon = botAtual.desligado ? e.full.desativado : e.full.ativado;

    const embed = new EmbedBuilder()
        .setTitle(`${e.full.perfil} Painel da Licença: ${botAtual.marca}`)
        .setDescription(`Gerenciando **Bot ${index + 1} de ${totalBots}**`)
        .addFields(
            { name: `${e.full.zyphor} Marca / Bot`, value: `\`${botAtual.marca}\``, inline: true },
            { name: `${e.full.config} Tipo`, value: `\`${botAtual.tipo_bot || 'Z-01'}\``, inline: true },
            { name: `${e.full.alerta} Status`, value: `${statusIcon} ${botAtual.desligado ? "Expirado" : "Ativo"}`, inline: true },
            { name: `${e.full.horario} Expiração`, value: botAtual.permanente ? `${e.full.fixo} Permanente` : `${diasRestantes} dias`, inline: true },
            { name: `${e.full.id} Servidor ID`, value: botAtual.guild_id ? `\`${botAtual.guild_id}\`` : "Nenhum vinculado", inline: true }
        )
        .setColor(botAtual.desligado ? "#ff0000" : "#00ff00")
        .setFooter({ text: `Zyphor System` });

    const rowLinks = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Adicionar Bot (OAuth2)')
            .setURL(configGeral.linkOAuth2)
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

    const components = totalBots > 1 ? [rowLinks, rowNavegacao] : [rowLinks];

    return { embeds: [embed], components };
}

// -------------------------------------------------------------
// 7. COMANDOS DE TEXTO
// -------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = "z.";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // COMANDO Z.CONFIG (EXIBE ESTATÍSTICAS)
    if (command === 'config') {
        if (message.guild.id !== CONFIG_SERVIDORES.admGuildId || !OWNERS_IDS.includes(message.author.id)) {
            return message.reply(`${e.full.proibido} Apenas Owners podem usar este comando.`);
        }

        const stats = await obterEstatisticasBots();

        const embed = new EmbedBuilder()
            .setTitle(`${e.full.config} Configurações & Estatísticas do Sistema`)
            .addFields(
                { name: `${e.full.verde} Bots Ativos`, value: `\`${stats.ativos}\``, inline: true },
                { name: `${e.full.vermelho} Bots Expirados`, value: `\`${stats.expirados}\``, inline: true },
                { name: `${e.full.zyphor} Marcas Registradas`, value: `\`${stats.totalMarcas}\``, inline: true },
                { name: "Mensagem de Expiração (DM)", value: `\`\`\`${configGeral.msgExpiracao}\`\`\`` },
                { name: "Link do Suporte", value: `\`\`\`${configGeral.linkSuporte}\`\`\`` },
                { name: "Link OAuth2 (Adicionar Bot)", value: `\`\`\`${configGeral.linkOAuth2}\`\`\`` }
            )
            .setColor("#2b2d31");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_abrir_config_modal')
                .setLabel('Editar Ajustes')
                .setEmoji(e.id.config)
                .setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    // COMANDO Z.PAINEL-ADM
    if (command === 'painel-adm') {
        if (message.guild.id !== CONFIG_SERVIDORES.admGuildId || !OWNERS_IDS.includes(message.author.id)) {
            return message.reply(`${e.full.proibido} Acesso negado!`);
        }

        const stats = await obterEstatisticasBots();

        const embed = new EmbedBuilder()
            .setTitle(`${e.full.config} Painel Administrativo`)
            .setDescription(`${e.full.alerta} Gerenciamento geral do sistema de licenças.`)
            .addFields(
                { name: `${e.full.verde} Ativos`, value: `\`${stats.ativos}\``, inline: true },
                { name: `${e.full.vermelho} Expirados`, value: `\`${stats.expirados}\``, inline: true },
                { name: `${e.full.zyphor} Marcas`, value: `\`${stats.totalMarcas}\``, inline: true }
            )
            .setColor("#ff0000");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('adm_remover_bot_modal')
                .setLabel('Remover Bot/Licença')
                .setEmoji(e.id.vermelho)
                .setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    // COMANDO Z.PAINEL
    if (command === 'painel') {
        if (message.guild.id !== CONFIG_SERVIDORES.vendasGuildId) {
            return message.reply(`${e.full.proibido} Este comando só pode ser usado no **Servidor de Vendas**!`);
        }

        const embed = new EmbedBuilder()
            .setTitle(`${e.full.zyphor} Gerenciamento de Bots & Licenças`)
            .setDescription(`${e.full.config} Clique no botão abaixo para abrir o seu painel de controle.`)
            .setColor("#2b2d31");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_painel_cliente')
                .setLabel('Gerenciar Meu Bot')
                .setEmoji(e.id.perfil)
                .setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
});

// -------------------------------------------------------------
// 8. INTERAÇÕES DE BOTÕES E MODAIS
// -------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_abrir_config_modal') {
            const modal = new ModalBuilder()
                .setCustomId('modal_salvar_config')
                .setTitle('Configurações Gerais');

            const msgInput = new TextInputBuilder()
                .setCustomId('input_msg_expiracao')
                .setLabel('Mensagem da DM (Expiração)')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(configGeral.msgExpiracao)
                .setRequired(true);

            const suporteInput = new TextInputBuilder()
                .setCustomId('input_link_suporte')
                .setLabel('Link do Servidor de Suporte')
                .setStyle(TextInputStyle.Short)
                .setValue(configGeral.linkSuporte)
                .setRequired(true);

            const oauthInput = new TextInputBuilder()
                .setCustomId('input_link_oauth')
                .setLabel('Link OAuth2 (Adicionar Bot)')
                .setStyle(TextInputStyle.Short)
                .setValue(configGeral.linkOAuth2)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(msgInput),
                new ActionRowBuilder().addComponents(suporteInput),
                new ActionRowBuilder().addComponents(oauthInput)
            );

            return await interaction.showModal(modal);
        }

        // ABRIR MODAL DE REMOÇÃO DE BOT
        if (interaction.customId === 'adm_remover_bot_modal') {
            const modal = new ModalBuilder()
                .setCustomId('modal_remover_bot_confirm')
                .setTitle('Remover Licença');

            const inputMarca = new TextInputBuilder()
                .setCustomId('input_remover_marca')
                .setLabel('Marca ou ID do Bot a Remover')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(inputMarca));
            return await interaction.showModal(modal);
        }

        if (interaction.customId === 'abrir_painel_cliente') {
            const { data: botsCliente } = await supabase
                .from('bots')
                .select('*')
                .eq('dono_id', interaction.user.id);

            if (!botsCliente || botsCliente.length === 0) {
                return interaction.reply({
                    content: `${e.full.alerta} Nenhuma licença encontrada para sua conta.`,
                    ephemeral: true
                });
            }

            const painelDados = gerarPainelCliente(botsCliente, 0, interaction.user.id);
            return interaction.reply({ ...painelDados, ephemeral: true });
        }

        if (interaction.customId.startsWith('painel_prev_') || interaction.customId.startsWith('painel_next_')) {
            const parts = interaction.customId.split('_');
            const action = parts[1];
            const ownerId = parts[2];
            let currentIndex = parseInt(parts[3]);

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: `${e.full.proibido} Você não tem permissão para navegar neste painel.`, ephemeral: true });
            }

            const { data: botsCliente } = await supabase
                .from('bots')
                .select('*')
                .eq('dono_id', ownerId);

            if (!botsCliente || botsCliente.length === 0) return;

            if (action === 'prev' && currentIndex > 0) {
                currentIndex--;
            } else if (action === 'next' && currentIndex < botsCliente.length - 1) {
                currentIndex++;
            }

            const painelAtualizado = gerarPainelCliente(botsCliente, currentIndex, ownerId);
            return interaction.update(painelAtualizado);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_salvar_config') {
            configGeral.msgExpiracao = interaction.fields.getTextInputValue('input_msg_expiracao');
            configGeral.linkSuporte = interaction.fields.getTextInputValue('input_link_suporte');
            configGeral.linkOAuth2 = interaction.fields.getTextInputValue('input_link_oauth');

            return interaction.reply({
                content: `${e.full.verde} Configurações salvas com sucesso!`,
                ephemeral: true
            });
        }

        // PROCESSAR REMOÇÃO DE BOT
        if (interaction.customId === 'modal_remover_bot_confirm') {
            const marcaAlvo = interaction.fields.getTextInputValue('input_remover_marca').trim();

            const { data: botEncontrado } = await supabase
                .from('bots')
                .select('*')
                .eq('marca', marcaAlvo)
                .single();

            if (!botEncontrado) {
                return interaction.reply({ content: `${e.full.alerta} Nenhuma licença encontrada com a marca \`${marcaAlvo}\`.`, ephemeral: true });
            }

            // Deleta o tópico do cliente se ele existir
            if (botEncontrado.thread_id) {
                try {
                    const canal = await client.channels.fetch(ID_CANAL_TOPICOS_CLIENTES);
                    const thread = await canal.threads.fetch(botEncontrado.thread_id);
                    if (thread) await thread.delete();
                } catch (err) {}
            }

            // Remove do Supabase
            await supabase.from('bots').delete().eq('id', botEncontrado.id);

            return interaction.reply({ content: `${e.full.verde} Licença do bot **${marcaAlvo}** removida com sucesso!`, ephemeral: true });
        }
    }
});

const BOT_TOKEN = process.env.DISCORD_TOKEN || 'SEU_TOKEN_AQUI';
client.login(BOT_TOKEN);
