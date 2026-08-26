const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// -------------------------------------------------------------
// 1. CONFIGURAÇÕES E SUPABASE
// -------------------------------------------------------------
const SUPABASE_URL = 'https://mwbmwrrzwiobrpeiwvae.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1sq2Yrw5-uZGX8ekrlY1vw_VHskga7q';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OWNERS_IDS = ["1521362851502227588", "1533306874513068093"];
const CONFIG_SERVIDORES = {
    vendasGuildId: "1540042508073967767",
    admGuildId: "1534610574053474466"
};
const ID_CANAL_TOPICOS_CLIENTES = "1534610574053474466"; 

const LINK_OAUTH2 = "https://discord.com/oauth2/authorize?client_id=SEU_CLIENT_ID&permissions=8&scope=bot";

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
        zyphor: "1540096483276095621"
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
// 2. FUNÇÃO DE CRIAR/ATUALIZAR TÓPICO DO CLIENTE
// -------------------------------------------------------------
async function sincronizarTopicoCliente(botDados) {
    try {
        const canal = await client.channels.fetch(ID_CANAL_TOPICOS_CLIENTES);
        if (!canal) return;

        const statusTag = botDados.desligado ? "🔴 [EXPIRADO]" : "🟢 [ATIVO]";
        const nomeTopico = `${statusTag} ${botDados.marca} | ${botDados.tipo_bot || 'Z-01'}`;

        const embedTopico = new EmbedBuilder()
            .setAuthor({ name: "Zyphor System • Registro de Licença", iconURL: client.user.displayAvatarURL() })
            .setTitle(`${e.full.zyphor} Bot: ${botDados.marca}`)
            .addFields(
                { name: `${e.full.id} Proprietário`, value: `<@${botDados.dono_id}>\n\`${botDados.dono_id}\``, inline: true },
                { name: `${e.full.config} Tipo`, value: `\`\`\`${botDados.tipo_bot || 'Z-01'}\`\`\``, inline: true },
                { name: `${e.full.horario} Expiração`, value: botDados.permanente ? `${e.full.fixo} **Vitalícia**` : `<t:${Math.floor(Number(botDados.expiracao)/1000)}:R>`, inline: true }
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

// -------------------------------------------------------------
// 3. COMANDOS DO PAINEL
// -------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content === 'z.painel-adm') {
        if (!OWNERS_IDS.includes(message.author.id)) {
            return message.reply(`${e.full.proibido} Acesso negado.`);
        }

        const { data: bots } = await supabase.from('bots').select('*');
        const ativos = bots ? bots.filter(b => !b.desligado).length : 0;
        const expirados = bots ? bots.filter(b => b.desligado).length : 0;
        const marcas = bots ? new Set(bots.map(b => b.marca)).size : 0;

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Zyphor Management • Painel Geral", iconURL: client.user.displayAvatarURL() })
            .setTitle(`${e.full.config} Painel Administrativo`)
            .setDescription(`${e.full.alerta} *Gerenciamento central de licenças e bots do sistema.*\n\u200b`)
            .addFields(
                { name: `${e.full.verde} Ativos`, value: `\`\`\`\n${ativos}\`\`\``, inline: true },
                { name: `${e.full.vermelho} Expirados`, value: `\`\`\`\n${expirados}\`\`\``, inline: true },
                { name: `${e.full.zyphor} Marcas`, value: `\`\`\`\n${marcas}\`\`\``, inline: true }
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
// 4. PROCESSAMENTO DE BOTÕES E MODAIS
// -------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        // ABRIR MODAL ADICIONAR
        if (interaction.customId === 'btn_add_bot') {
            const modal = new ModalBuilder()
                .setCustomId('modal_add_bot')
                .setTitle('Adicionar Nova Licença');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dono_id').setLabel('ID do Cliente').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('marca').setLabel('Nome da Marca/Bot').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tipo').setLabel('Tipo (Ex: Z-01, Vendas)').setStyle(TextInputStyle.Short).setValue('Z-01').setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dias').setLabel('Dias de Validade (0 = Permanente)').setStyle(TextInputStyle.Short).setValue('30').setRequired(true))
            );

            return await interaction.showModal(modal);
        }

        // ABRIR MODAL REMOVER
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
                        .setRequired(true)
                )
            );

            return await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        // SUBMIT: ADICIONAR BOT
        if (interaction.customId === 'modal_add_bot') {
            await interaction.deferReply({ ephemeral: true });

            const donoId = interaction.fields.getTextInputValue('dono_id');
            const marca = interaction.fields.getTextInputValue('marca');
            const tipo = interaction.fields.getTextInputValue('tipo');
            const dias = parseInt(interaction.fields.getTextInputValue('dias'));

            const permanente = dias === 0;
            const expiracao = permanente ? 0 : Date.now() + (dias * 24 * 60 * 60 * 1000);

            const { data: novoBot, error } = await supabase.from('bots').insert([{
                dono_id: donoId,
                marca: marca,
                tipo_bot: tipo,
                expiracao: expiracao,
                permanente: permanente,
                desligado: false
            }]).select().single();

            if (error) {
                return interaction.editReply(`${e.full.proibido} Erro ao salvar no banco: ${error.message}`);
            }

            // Criar tópico no canal de clientes
            const threadId = await sincronizarTopicoCliente(novoBot);
            if (threadId) {
                await supabase.from('bots').update({ thread_id: threadId }).eq('id', novoBot.id);
            }

            // Enviar botão do OAuth2 para o cliente adicionar o bot no servidor dele
            const rowOAuth = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Adicionar Bot ao Servidor (OAuth2)')
                    .setURL(LINK_OAUTH2)
                    .setStyle(ButtonStyle.Link)
            );

            return interaction.editReply({
                content: `${e.full.verde} **Licença registrada com sucesso!**\nO tópico do cliente foi gerado no canal de logs.\n\nEnvie o botão abaixo para o cliente adicionar o bot:`,
                components: [rowOAuth]
            });
        }

        // SUBMIT: REMOVER BOT
        if (interaction.customId === 'modal_remove_bot') {
            await interaction.deferReply({ ephemeral: true });

            const idBusca = interaction.fields.getTextInputValue('bot_id_remove');

            const { data: botExistente } = await supabase
                .from('bots')
                .select('*')
                .or(`id.eq.${idBusca},dono_id.eq.${idBusca}`)
                .maybeSingle();

            if (!botExistente) {
                return interaction.editReply(`${e.full.proibido} Nenhuma licença foi encontrada com esse ID.`);
            }

            await supabase.from('bots').delete().eq('id', botExistente.id);

            return interaction.editReply(`${e.full.verde} Licença da marca **${botExistente.marca}** removida com sucesso!`);
        }
    }
});

const BOT_TOKEN = process.env.DISCORD_TOKEN || 'SEU_TOKEN_AQUI';
client.login(BOT_TOKEN);
