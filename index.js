// -------------------------------------------------------------
// 5. INTERAÇÕES DE BOTÕES E MODAIS
// -------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        // --- PAINEL DO CLIENTE ---
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

            // BOTÃO REGISTRAR BOT (ABRE O FORMULÁRIO)
            if (interaction.customId === 'adm_registrar_bot') {
                const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

                const modal = new ModalBuilder()
                    .setCustomId('modal_registrar_bot')
                    .setTitle('Registrar Nova Licença');

                const donoInput = new TextInputBuilder()
                    .setCustomId('input_dono_id')
                    .setLabel('ID do Discord do Cliente')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 1521362851502227588')
                    .setRequired(true);

                const marcaInput = new TextInputBuilder()
                    .setCustomId('input_marca')
                    .setLabel('Nome / Marca do Bot')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: Zyphor Vendas')
                    .setRequired(true);

                const diasInput = new TextInputBuilder()
                    .setCustomId('input_dias')
                    .setLabel('Dias de Licença (ou 0 para Permanente)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('30')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(donoInput),
                    new ActionRowBuilder().addComponents(marcaInput),
                    new ActionRowBuilder().addComponents(diasInput)
                );

                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'adm_gerenciar_tempo') {
                return interaction.reply({ content: `${e.horario} Módulo de Gerenciamento selecionado.`, ephemeral: true });
            }

            if (interaction.customId === 'adm_remover_bot') {
                return interaction.reply({ content: `${e.vermelho} Módulo de Remoção selecionado.`, ephemeral: true });
            }
        }
    }

    // --- PROCESSAR O FORMULÁRIO ENVIADO ---
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registrar_bot') {
        const donoId = interaction.fields.getTextInputValue('input_dono_id').trim();
        const marca = interaction.fields.getTextInputValue('input_marca').trim();
        const dias = parseInt(interaction.fields.getTextInputValue('input_dias').trim());

        const ePermanente = dias === 0;
        const expiracaoTimestamp = ePermanente ? 0 : Date.now() + (dias * 24 * 60 * 60 * 1000);

        const { error } = await supabase.from('bots').insert([
            {
                dono_id: donoId,
                marca: marca,
                expiracao: expiracaoTimestamp,
                permanente: ePermanente,
                desligado: false
            }
        ]);

        if (error) {
            console.error(error);
            return interaction.reply({ content: `${e.alerta} Erro ao salvar no banco de dados!`, ephemeral: true });
        }

        return interaction.reply({
            content: `${e.verde} Bot **${marca}** registrado com sucesso para o usuário <@${donoId}>!`,
            ephemeral: true
        });
    }
});
