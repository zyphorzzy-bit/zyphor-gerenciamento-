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
// ROTINA AUTOMÁTICA DE VERIFICAÇÃO DE EXPIRAÇÃO E AVISO DE 3 DIAS
// -------------------------------------------------------------
async function verificarExpiracoes() {
    try {
        const { data: bots, error } = await supabase.from('bots').select('*');
        if (error || !bots) return;

        const agora = Date.now();
        const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

        for (const botDados of bots) {
            if (botDados.permanente) continue;

            const tempoRestante = Number(botDados.expiracao) - agora;

            // 1. AVISO FALTANDO 3 DIAS (Enviar apenas uma vez)
            if (tempoRestante > 0 && tempoRestante <= TRES_DIAS_MS && !botDados.aviso_3d_enviado) {
                try {
                    const dono = await client.users.fetch(botDados.dono_id);
                    if (dono) {
                        const embedAviso = new EmbedBuilder()
                            .setTitle(`${e.full.alerta} AVISO DE EXPIRAÇÃO - ZYPHOR SYSTEM`)
                            .setDescription(`A sua licença para a aplicação **${botDados.marca}** irá expirar em menos de **3 dias**!\n\nRealize a renovação com antecedência para evitar a interrupção nos serviços do bot.`)
                            .addFields(
                                { name: "Bot / Marca", value: `\`${botDados.marca}\``, inline: true },
                                { name: "Expiração", value: `<t:${Math.floor(Number(botDados.expiracao) / 1000)}:R>`, inline: true }
                            )
                            .setColor("#ffcc00")
                            .setTimestamp();

                        const rowSuporte = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setLabel('Renovar Licença')
                                .setURL(configGeral.linkSuporte)
                                .setStyle(ButtonStyle.Link)
                        );

                        await dono.send({ embeds: [embedAviso], components: [rowSuporte] }).catch(() => {});
                    }
                } catch (err) {
                    console.error(`Erro ao enviar DM de aviso 3 dias para ${botDados.dono_id}:`, err);
                }

                // Marca no Supabase que o aviso de 3 dias já foi enviado
                await supabase.from('bots').update({ aviso_3d_enviado: true }).eq('id', botDados.id);
            }

            // 2. DESATIVAR BOT SE EXPIRED (E não estiver desligado ainda)
            if (agora >= Number(botDados.expiracao) && !botDados.desligado) {
                // Atualiza o status no Supabase para desligado
                await supabase.from('bots').update({ desligado: true }).eq('id', botDados.id);
                botDados.desligado = true;

                // Notifica no tópico de logs do Discord
                await sincronizarTopicoCliente(botDados);

                // Notifica o cliente via DM que o bot foi bloqueado
                try {
                    const dono = await client.users.fetch(botDados.dono_id);
                    if (dono) {
                        const embedExpirou = new EmbedBuilder()
                            .setTitle(`${e.full.proibido} LICENÇA EXPIRADA - ZYPHOR SYSTEM`)
                            .setDescription(`A sua licença para o bot **${botDados.marca}** expirou e as funções do bot foram **bloqueadas** automaticamente.\n\nPara reativar suas permissões, faça a renovação com a nossa equipe.`)
                            .setColor("#ff4d4d")
                            .setTimestamp();

                        const rowSuporte = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setLabel('Falar com Suporte')
                                .setURL(configGeral.linkSuporte)
                                .setStyle(ButtonStyle.Link)
                        );

                        await dono.send({ embeds: [embedExpirou], components: [rowSuporte] }).catch(() => {});
                    }
                } catch (err) {
                    console.error(`Erro ao enviar DM de bloqueio para ${botDados.dono_id}:`, err);
                }
            }
        }
    } catch (err) {
        console.error("Erro na verificação de expiração automatizada:", err);
    }
}

// -------------------------------------------------------------
// 2. SISTEMA DE STREAM / PRESENÇA
// -------------------------------------------------------------
client.once('ready', () => {
    console.log(`[ONLINE] Bot conectado como ${client.user.tag}`);

    client.user.setPresence({
        activities: [{
            name: 'Zyphor System • Gerenciamento',
            type: ActivityType.Streaming,
            url: 'https://www.twitch.tv/discord'
        }],
        status: 'online'
    });

    // Inicia a checagem automática a cada 60 segundos
    setInterval(verificarExpiracoes, 60000);
    verificarExpiracoes();
});

// -------------------------------------------------------------
// 3. SINCRONIZAÇÃO DE TÓPICOS DOS CLIENTES (LOGS)
// -------------------------------------------------------------
async function sincronizarTopicoCliente(botDados) {
    try {
        const canal = await client.channels.fetch(ID_CANAL_TOPICOS_CLIENTES);
        if (!canal) return null;

        const statusTag = botDados.desligado ? "🔴 [EXPIRADO]" : "🟢 [ATIVO]";
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
            reason: `Licença criada para: ${botDados.marca}`
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
            { name: `${e.full.alerta} Status`, value: `${statusIcon} **${botAtual.desligado ? "Expirado" : "Ativo"}**`, inline: true },
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
// 4. COMANDOS DE MENSAGEM (z.painel, z.config, z.painel-adm)
// -------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = "z.";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'config') {
        if (!OWNERS_IDS.includes(message.author.id)) {
            return message.reply(`${e.full.proibido} Acesso restrito aos proprietários.`);
        }

        const stats = await obterEstatisticasBots();

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Painel de Controle • Administrador", iconURL: message.guild.iconURL() })
            .setTitle(`${e.full.config} Configurações Gerais & Stats`)
            .setDescription(`>>> *Visão geral dos bots registrados na rede Zyphor System.*\n---`)
            .addFields(
                { name: `${e.full.verde} Ativos`, value: `\`\`\`${stats.ativos}\`\`\``, inline: true },
                { name: `${e.full.vermelho} Expirados`, value: `\`\`\`${stats.expirados}\`\`\``, inline: true },
                { name: `${e.full.zyphor} Marcas`, value: `\`\`\`${stats.totalMarcas}\`\`\``, inline: true }
            )
            .setColor("#2b2d31")
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

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

    if (command === 'painel-adm') {
        if (!OWNERS_IDS.includes(message.author.id)) {
            return message.reply(`${e.full.proibido} Acesso negado.`);
        }

        const stats = await obterEstatisticasBots();

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Zyphor Management • Painel Geral", iconURL: client.user.displayAvatarURL() })
            .setTitle(`${e.full.config} Painel Administrativo`)
            .setDescription(`${e.full.alerta} *Gerenciamento central de licenças e bots do sistema.*\n\u200b`)
            .addFields(
                { name: `${e.full.verde} Ativos`, value: `\`\`\`\n${stats.ativos}\`\`\``, inline: true },
                { name: `${e.full.vermelho} Expirados`, value: `\`\`\`\n${stats.expirados}\`\`\``, inline: true },
                { name: `${e.full.zyphor} Marcas`, value: `\`\`\`\n${stats.totalMarcas}\`\`\``, inline: true }
            )
            .setColor("#ff4d4d");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_add_bot')
                .setLabel('Adicionar Bot/Licença')
                .setEmoji(e.id.verde)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('btn_remove_bot')
                .setLabel('Remover Bot/Licença')
                .setEmoji(e.id.vermelho)
                .setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
});

// -------------------------------------------------------------
// 5. EVENTOS DE INTERAÇÃO (BOTÕES E MODAIS)
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
                    new TextInputBuilder().setCustomId('dono_id').setLabel('ID do Cliente').setStyle(TextInputStyle.Short).setPlaceholder('ID do usuário no Discord').setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('bot_client_id').setLabel('ID da Aplicação/Bot (Para OAuth2)').setStyle(TextInputStyle.Short).setPlaceholder('Opcional').setRequired(false)
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

        if (interaction.customId === 'btn_remove_bot') {
            const modal = new ModalBuilder()
                .setCustomId('modal_remove_bot')
                .setTitle('Remover Bot/Licença');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('bot_id_remove')
                        .setLabel('ID do Registro ou ID do Cliente')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Insira o ID para remoção')
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
            const botClientId = interaction.fields.getTextInputValue('bot_client_id')?.trim();
            const marca = interaction.fields.getTextInputValue('marca').trim();
            const tipo = interaction.fields.getTextInputValue('tipo').trim() || 'Z-01';
            const diasInput = interaction.fields.getTextInputValue('dias').trim();
            
            const dias = parseInt(diasInput) || 0;
            const permanente = dias === 0;
            const expiracao = permanente ? 0 : Date.now() + (dias * 24 * 60 * 60 * 1000);

            const { data: novoBot, error } = await supabase.from('bots').insert([{
                dono_id: donoId,
                bot_client_id: botClientId || null,
                marca: marca,
                tipo_bot: tipo,
                expiracao: expiracao,
                permanente: permanente,
                desligado: false,
                aviso_3d_enviado: false
            }]).select().single();

            if (error) {
                return interaction.editReply(`${e.full.proibido} **Erro ao salvar no banco:** ${error.message}`);
            }

            const threadId = await sincronizarTopicoCliente(novoBot);
            if (threadId) {
                await supabase.from('bots').update({ thread_id: threadId }).eq('id', novoBot.id);
            }

            const urlOAuth2 = botClientId 
                ? `https://discord.com/oauth2/authorize?client_id=${botClientId}&permissions=8&scope=bot`
                : configGeral.linkOAuth2;

            const rowOAuth = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Adicionar Bot ao Servidor')
                    .setURL(urlOAuth2)
                    .setStyle(ButtonStyle.Link)
            );

            return interaction.editReply({
                content: `${e.full.verde} **Licença cadastrada com sucesso!**\n> **Cliente:** <@${donoId}>\n> **Marca:** \`${marca}\`\n> **Validade:** ${permanente ? 'Vitalícia' : `\`${dias} Dias\``}`,
                components: [rowOAuth]
            });
        }

        if (interaction.customId === 'modal_remove_bot') {
            await interaction.deferReply({ ephemeral: true });

            const idBusca = interaction.fields.getTextInputValue('bot_id_remove').trim();

            const { data: botsEncontrados, error: searchError } = await supabase
                .from('bots')
                .select('*')
                .or(`id.eq.${idBusca},dono_id.eq.${idBusca}`);

            if (searchError || !botsEncontrados || botsEncontrados.length === 0) {
                return interaction.editReply(`${e.full.proibido} Nenhuma licença foi encontrada com o ID informado (\`${idBusca}\`).`);
            }

            const { error: deleteError } = await supabase
                .from('bots')
                .delete()
                .or(`id.eq.${idBusca},dono_id.eq.${idBusca}`);

            if (deleteError) {
                return interaction.editReply(`${e.full.proibido} Erro ao remover do banco de dados: ${deleteError.message}`);
            }

            return interaction.editReply(`${e.full.verde} Foram removidas **${botsEncontrados.length}** licença(s) associada(s) ao ID \`${idBusca}\`.`);
        }
    }
});

const BOT_TOKEN = process.env.DISCORD_TOKEN || 'SEU_TOKEN_AQUI';
client.login(BOT_TOKEN);
