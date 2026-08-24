const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ChannelSelectMenuBuilder,
  ChannelType,
  ActivityType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const Jsoning = require('jsoning');
const db = new Jsoning('database.json');

const e = {
  alerta: "<:alerta:1534611993410015456>",
  horario: "<:horrio:1534611997335883886>",
  config: "<:config:1534611990633250937>",
  proibido: "<:Proibido:1534611991929290877>",
  apagado: "<:apagado:1539124689077665894>",
  protecao: "<:proteo:1539125790711480331>",
  positivo: "<:positivo:1534611995742179419>",
  negativo: "<:negativo:1534612858548256921>",
  perfil: "<:perfil:1540557352602705990>",
  aceitar: "<:aceitar:1539124696912756767>",
  recusar: "<:recusar:1539124698338566257>",
  ativado: "<a:ativado:1534611985260609607>",
  desativado: "<a:desativado:1534611986539876463>",
  loading: "<a:loanding:1534612861211377868>",
  seta: "<:seta:1539785898693234700>",
  warn: "<:warn:1539125781320433724>"
};

const AUTORIZADOS = ['1533306874513068093', '1465045589107413174'];
const OWNERS_IDS = ["1521362851502227588", "1533306874513068093"];
const LINK_SUPORTE = "https://discord.gg/uAaSXMkUg4";

const cooldowns = new Map();
const userMap = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

function formatarTempoExtenso(ms) {
  const minutos = Math.floor((ms / (1000 * 60)) % 60);
  const horas = Math.floor(ms / (1000 * 60 * 60));
  return `${horas}h ${minutos}m`;
}

function formatarTempoReset(ms) {
  if (ms <= 0) return 'Resetando...';
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24));
  const horas = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((ms / (1000 * 60)) % 60);

  let partes = [];
  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  partes.push(`${minutos}m`);
  return partes.join(' ');
}

client.once('ready', async () => {
  console.log(`Bot online em ${client.user.tag}`);

  const streamSalva = await db.get('status_stream');
  if (streamSalva) {
    client.user.setActivity(streamSalva, {
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/twitch'
    });
  }

  await client.application.commands.set([
    { name: 'config', description: 'Painel interativo de configurações do bot' }
  ]);
});

// EVENTO DE MENSAGEM
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // TRAVA DE LICENÇA
  const isOwner = OWNERS_IDS.includes(message.author.id);
  const botData = await db.get(`bot_${client.user.id}`);

  if (botData) {
    const ehPermanente = botData.permanente || false;
    const expirado = !ehPermanente && (Date.now() > botData.expiracao);

    if (botData.guildId && message.guild.id !== botData.guildId && !isOwner) {
      return;
    }

    if ((expirado || botData.desligado) && !isOwner) {
      const embedExpirado = new EmbedBuilder()
        .setTitle('<:warn:1539125781320433724> Sistema Expirado / Desligado')
        .setDescription('O período de licença deste bot expirou ou ele foi desligado pelo gerenciador.\n\nNenhum comando funcionará até que a assinatura seja renovada.')
        .setColor('#ff3333');

      const btnSuporte = new ButtonBuilder()
        .setLabel('Abrir Ticket / Suporte')
        .setEmoji('1539845832004870154')
        .setStyle(ButtonStyle.Link)
        .setUrl(LINK_SUPORTE);

      message.reply({ embeds: [embedExpirado], components: [new ActionRowBuilder().addComponents(btnSuporte)] });
      return; 
    }
  }

  // ANTI-SPAM
  const antiSpamAtivo = await db.get(`antispam_status_${message.guild.id}`);
  if (antiSpamAtivo && !AUTORIZADOS.includes(message.author.id) && !message.member.permissions.has('Administrator')) {
    const LIMIT = 5;
    const TIME = 5000;

    if (userMap.has(message.author.id)) {
      const userData = userMap.get(message.author.id);
      const difference = message.createdTimestamp - userData.lastMessage.createdTimestamp;
      let msgCount = userData.msgCount;

      if (difference > TIME) {
        clearTimeout(userData.timer);
        userData.msgCount = 1;
        userData.lastMessage = message;
        userData.timer = setTimeout(() => { userMap.delete(message.author.id); }, TIME);
        userMap.set(message.author.id, userData);
      } else {
        msgCount++;
        if (msgCount >= LIMIT) {
          await message.delete().catch(() => {});
          message.channel.send(`${e.warn} ${message.author}, pare de enviar mensagens tão rápido!`).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
          userMap.delete(message.author.id);
          return;
        } else {
          userData.msgCount = msgCount;
          userMap.set(message.author.id, userData);
        }
      }
    } else {
      let fn = setTimeout(() => { userMap.delete(message.author.id); }, TIME);
      userMap.set(message.author.id, { msgCount: 1, lastMessage: message, timer: fn });
    }
  }

  // Comando .f (Altera Stream)
  if (message.content.startsWith('.f')) {
    if (!AUTORIZADOS.includes(message.author.id)) {
      return message.reply(`${e.proibido} Você não tem permissão para alterar a stream.`);
    }
    const novoTexto = message.content.slice(2).trim();
    if (!novoTexto) return message.reply(`${e.alerta} **Uso:** \`.f <mensagem>\``);

    client.user.setActivity(novoTexto, { type: ActivityType.Streaming, url: 'https://www.twitch.tv/twitch' });
    await db.set('status_stream', novoTexto);
    return message.reply(`${e.positivo} **Stream atualizada para:** \`${novoTexto}\``);
  }

  // Comando fox.rank
  if (message.content.toLowerCase() === 'fox.rank') {
    const msgRank = await message.channel.send({ content: `${e.loading} Carregando ranking...` });

    const atualizar = async () => {
      try {
        await atualizarRankEmbed(msgRank, message.guild);
      } catch (err) {
        clearInterval(interval);
      }
    };

    await atualizar();
    const interval = setInterval(atualizar, 15000);
    return;
  }

  if (!message.content.toLowerCase().startsWith('z.')) return;

  const canaisPermitidos = (await db.get(`allowed_channels_${message.guild.id}`)) || [];
  if (canaisPermitidos.length > 0 && !canaisPermitidos.includes(message.channel.id) && !AUTORIZADOS.includes(message.author.id)) {
    return message.reply({ content: `${e.proibido} Os comandos só podem ser usados nos canais autorizados!` }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
  }

  const now = Date.now();
  const cooldownAmount = 5000;
  if (cooldowns.has(message.author.id)) {
    const expirationTime = cooldowns.get(message.author.id) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
      return message.reply(`${e.alerta} Aguarde **${timeLeft}s** para usar outro comando.`).then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
    }
  }
  cooldowns.set(message.author.id, now);

  const args = message.content.slice(2).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (['kiss', 'tapa', 'beijo', 'hug', 'slap'].includes(command)) {
    const alvo = message.mentions.users.first();
    if (!alvo || alvo.id === message.author.id) return message.reply(`${e.alerta} Mencione alguém!`);

    const acaoTexto = command === 'tapa' || command === 'slap' ? 'deu um tapa em' : 'deu um beijo em';
    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`retaliar_${command}_${message.author.id}`).setLabel('Retribuir').setStyle(ButtonStyle.Primary)
    );

    return message.reply({ content: `${e.perfil} ${message.author} ${acaoTexto} ${alvo}!`, components: [btn] });
  }

  if (command === 'bf' || command === 'casar') {
    const alvo = message.mentions.users.first();
    if (!alvo || alvo.id === message.author.id) return message.reply(`${e.alerta} Mencione alguém!`);

    const tipo = command === 'bf' ? 'Best Friend (BF)' : 'Casamento';
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aceitar_${command}_${message.author.id}_${alvo.id}`).setEmoji(e.aceitar).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${command}_${message.author.id}_${alvo.id}`).setEmoji(e.recusar).setStyle(ButtonStyle.Danger)
    );

    return message.reply({ content: `${e.perfil} ${alvo}, ${message.author} enviou um pedido de **${tipo}**! Aceita?`, components: [row] });
  }
});

// SISTEMA DE RANK DE CALL CORRIGIDO
async function atualizarRankEmbed(message, guild) {
  let diasReset = (await db.get(`rank_reset_days_${guild.id}`)) || 1;
  let proxReset = await db.get(`rank_next_reset_${guild.id}`);

  if (!proxReset) {
    proxReset = Date.now() + (diasReset * 24 * 60 * 60 * 1000);
    await db.set(`rank_next_reset_${guild.id}`, proxReset);
  }

  if (Date.now() >= proxReset) {
    const allKeys = await db.all();
    for (const key in allKeys) {
      if (key.startsWith(`voice_time_${guild.id}_`) || key.startsWith(`voice_join_${guild.id}_`)) {
        await db.delete(key);
      }
    }
    proxReset = Date.now() + (diasReset * 24 * 60 * 60 * 1000);
    await db.set(`rank_next_reset_${guild.id}`, proxReset);
  }

  const now = Date.now();
  const membrosEmCall = guild.members.cache.filter(m => m.voice?.channelId && !m.user.bot);

  for (const [userId] of membrosEmCall) {
    const joinTime = await db.get(`voice_join_${guild.id}_${userId}`);
    if (joinTime) {
      const tempoDecorrido = now - joinTime;
      const tempoAntigo = Number(await db.get(`voice_time_${guild.id}_${userId}`)) || 0;
      await db.set(`voice_time_${guild.id}_${userId}`, tempoAntigo + tempoDecorrido);
      await db.set(`voice_join_${guild.id}_${userId}`, now);
    } else {
      await db.set(`voice_join_${guild.id}_${userId}`, now);
    }
  }

  const allData = await db.all();
  const prefix = `voice_time_${guild.id}_`;
  let ranking = [];

  for (const key in allData) {
    if (key.startsWith(prefix)) {
      const userId = key.replace(prefix, '');
      const tempo = Number(allData[key]) || 0;
      if (tempo > 0) ranking.push({ userId, tempo });
    }
  }

  ranking.sort((a, b) => b.tempo - a.tempo);
  const top10 = ranking.slice(0, 10);

  let descricao = "";
  if (top10.length === 0) {
    descricao = "*Nenhum membro acumulou tempo em call ainda.*";
  } else {
    top10.forEach((item, index) => {
      descricao += `${index + 1}º <@${item.userId}> — **${formatarTempoExtenso(item.tempo)}**\n\n`;
    });
  }

  const tempoRestanteReset = formatarTempoReset(proxReset - Date.now());

  const embed = new EmbedBuilder()
    .setTitle(`Rank da ${guild.name}`)
    .setColor("#2b2d31")
    .setDescription(descricao)
    .setFooter({ 
      text: `Próximo reset em: ${tempoRestanteReset} (a cada ${diasReset} ${diasReset === 1 ? 'dia' : 'dias'})` 
    });

  await message.edit({ content: null, embeds: [embed] }).catch(() => {});
}

// PAINEL DE CONFIGURAÇÕES COM VOLTAR
async function renderizarPainelPrincipal(guildId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('menu_principal_config')
    .setPlaceholder('Escolha o que deseja alterar...')
    .addOptions([
      { label: 'Ativar / Desativar Anti-Spam', value: 'op_antispam', emoji: '1534611991929290877' },
      { label: 'Editar Msg Boas-Vindas', value: 'op_edit_welcome', emoji: '1540557352602705990' },
      { label: 'Canais de Entrada', value: 'op_welcome', emoji: '1539124707222093915' },
      { label: 'Reset do Rank de Call', value: 'op_reset_days', emoji: '1534611997335883886' },
      { label: 'Logs de Mensagens/Fotos', value: 'op_logs_msg', emoji: '1534611993410015456' },
      { label: 'Logs de Call', value: 'op_logs_call', emoji: '1534611997335883886' }
    ]);

  const embed = new EmbedBuilder()
    .setTitle(`${e.config} Painel de Configurações`)
    .setColor("#2b2d31")
    .setDescription('Selecione uma opção no menu abaixo para configurar.');

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}

function criarBotaoVoltar() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_voltar_config')
      .setEmoji(e.seta)
      .setLabel('Voltar')
      .setStyle(ButtonStyle.Secondary)
  );
}

// EVENTO DE INTERAÇÕES
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'btn_voltar_config') {
      const painel = await renderizarPainelPrincipal(interaction.guildId);
      return interaction.update(painel);
    }

    const [act, cmd, authorId, targetId] = interaction.customId.split('_');

    if (act === 'retaliar') {
      return interaction.reply({ content: `${e.perfil} ${interaction.user} retribuiu o **${cmd}** em <@${authorId}>!` });
    }

    if (act === 'aceitar' && interaction.user.id === targetId) {
      await db.set(`${cmd}_${authorId}`, targetId);
      await db.set(`${cmd}_${targetId}`, authorId);
      return interaction.update({ content: `${e.positivo} <@${authorId}> e ${interaction.user} agora têm o vínculo de **${cmd}**!`, components: [] });
    }

    if (act === 'recusar' && interaction.user.id === targetId) {
      return interaction.update({ content: `${e.negativo} Pedido recusado.`, components: [] });
    }
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'config') {
    if (!AUTORIZADOS.includes(interaction.user.id)) {
      return interaction.reply({ content: `${e.proibido} Permissão negada.`, ephemeral: true });
    }
    const painel = await renderizarPainelPrincipal(interaction.guildId);
    return interaction.reply({ ...painel, ephemeral: true });
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_edit_welcome') {
      const texto = interaction.fields.getTextInputValue('welcome_text_input');
      const banner = interaction.fields.getTextInputValue('welcome_banner_input');

      await db.set(`welcome_text_${interaction.guildId}`, texto);
      if (banner) await db.set(`welcome_banner_${interaction.guildId}`, banner);

      return interaction.reply({ content: `${e.positivo} Boas-vindas configuradas!`, ephemeral: true });
    }
    if (interaction.customId === 'modal_reset_rank') {
      const dias = parseInt(interaction.fields.getTextInputValue('reset_days_input'));
      if (isNaN(dias) || dias < 1) return interaction.reply({ content: `${e.alerta} Insira um número válido!`, ephemeral: true });

      await db.set(`rank_reset_days_${interaction.guildId}`, dias);
      const proxReset = Date.now() + (dias * 24 * 60 * 60 * 1000);
      await db.set(`rank_next_reset_${interaction.guildId}`, proxReset);

      return interaction.reply({ content: `${e.positivo} Reset alterado para **${dias} dias**!`, ephemeral: true });
    }
  }

  if (interaction.isStringSelectMenu()) {
    const valor = interaction.values[0];

    if (valor === 'op_antispam') {
      const statusAtual = await db.get(`antispam_status_${interaction.guildId}`);
      const novoStatus = !statusAtual;
      await db.set(`antispam_status_${interaction.guildId}`, novoStatus);

      return interaction.update({ 
        content: novoStatus ? `${e.ativado} **Anti-Spam Ativado!**` : `${e.desativado} **Anti-Spam Desativado!**`, 
        components: [criarBotaoVoltar()],
        embeds: []
      });
    }

    if (valor === 'op_edit_welcome') {
      const textoAtual = (await db.get(`welcome_text_${interaction.guildId}`)) || 'Seja bem-vindo(a), {user}!';
      const bannerAtual = (await db.get(`welcome_banner_${interaction.guildId}`)) || '';

      const modal = new ModalBuilder().setCustomId('modal_edit_welcome').setTitle('Personalizar Entrada');
      const tInput = new TextInputBuilder().setCustomId('welcome_text_input').setLabel('Texto ({user} = menção)').setStyle(TextInputStyle.Paragraph).setValue(textoAtual);
      const bInput = new TextInputBuilder().setCustomId('welcome_banner_input').setLabel('URL da Imagem/GIF (Opcional)').setStyle(TextInputStyle.Short).setValue(bannerAtual).setRequired(false);

      modal.addComponents(new ActionRowBuilder().addComponents(tInput), new ActionRowBuilder().addComponents(bInput));
      await interaction.showModal(modal);
    }

    if (valor === 'op_reset_days') {
      const modal = new ModalBuilder().setCustomId('modal_reset_rank').setTitle('Reset do Rank de Call');
      const input = new TextInputBuilder().setCustomId('reset_days_input').setLabel('Dias para Reset (Ex: 1 ou 7)').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
    }

    if (valor === 'op_welcome') {
      const cSelect = new ChannelSelectMenuBuilder().setCustomId('select_canal_welcome').setPlaceholder('Selecione os canais').setChannelTypes(ChannelType.GuildText).setMinValues(1).setMaxValues(2);
      await interaction.update({ content: `${e.perfil} **Canais de Boas-Vindas**`, components: [new ActionRowBuilder().addComponents(cSelect), criarBotaoVoltar()], embeds: [] });
    }

    if (valor === 'op_logs_msg') {
      const cSelect = new ChannelSelectMenuBuilder().setCustomId('select_canal_logs_msg').setPlaceholder('Selecione o canal').setChannelTypes(ChannelType.GuildText);
      await interaction.update({ content: `${e.alerta} **Logs de Mensagem/Fotos**`, components: [new ActionRowBuilder().addComponents(cSelect), criarBotaoVoltar()], embeds: [] });
    }

    if (valor === 'op_logs_call') {
      const cSelect = new ChannelSelectMenuBuilder().setCustomId('select_canal_logs_call').setPlaceholder('Selecione o canal').setChannelTypes(ChannelType.GuildText);
      await interaction.update({ content: `${e.horario} **Logs de Call**`, components: [new ActionRowBuilder().addComponents(cSelect), criarBotaoVoltar()], embeds: [] });
    }
  }

  if (interaction.isChannelSelectMenu()) {
    const gId = interaction.guildId;
    if (interaction.customId === 'select_canal_welcome') await db.set(`welcome_channels_${gId}`, interaction.values);
    if (interaction.customId === 'select_canal_logs_msg') await db.set(`log_msg_${gId}`, interaction.values[0]);
    if (interaction.customId === 'select_canal_logs_call') await db.set(`log_call_${gId}`, interaction.values[0]);

    return interaction.update({ content: `${e.positivo} Configuração salva!`, components: [criarBotaoVoltar()], embeds: [] });
  }
});

// LOGS DE MENSAGENS APAGADAS
client.on('messageDelete', async (message) => {
  if (!message.guild || message.author?.bot) return;
  const logId = await db.get(`log_msg_${message.guild.id}`);
  if (!logId) return;

  const channel = message.guild.channels.cache.get(logId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(`${e.apagado} Mensagem Apagada`)
    .setColor("#ff4b4b")
    .addFields(
      { name: "Autor", value: `${message.author} (\`${message.author.id}\`)`, inline: true },
      { name: "Canal", value: `${message.channel}`, inline: true },
      { name: "Conteúdo", value: message.content ? `\`\`\`${message.content}\`\`\`` : "*Nenhum texto (Mídia)*" }
    )
    .setTimestamp();

  if (message.attachments.size > 0) {
    const anexo = message.attachments.first();
    if (anexo.contentType?.startsWith('image/')) {
      embed.setImage(anexo.proxyURL || anexo.url);
    }
  }

  await channel.send({ embeds: [embed] });
});

// EVENTO DE TEMPO DE CALL E LOGS
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  const userId = newState.id || oldState.id;
  const member = newState.member || oldState.member;

  if (!member || member.user.bot) return;

  if (!oldState.channelId && newState.channelId) {
    await db.set(`voice_join_${guild.id}_${userId}`, Date.now());
  } else if (oldState.channelId && !newState.channelId) {
    const joinTime = await db.get(`voice_join_${guild.id}_${userId}`);
    if (joinTime) {
      const tempo = Date.now() - joinTime;
      const antigo = Number(await db.get(`voice_time_${guild.id}_${userId}`)) || 0;
      await db.set(`voice_time_${guild.id}_${userId}`, antigo + tempo);
      await db.delete(`voice_join_${guild.id}_${userId}`);
    }
  }

  const logId = await db.get(`log_call_${guild.id}`);
  if (!logId) return;
  const channel = guild.channels.cache.get(logId);
  if (!channel) return;

  if (!oldState.channelId && newState.channelId) {
    await channel.send({ embeds: [new EmbedBuilder().setColor("#2ecc71").setDescription(`${e.positivo} ${member.user} **entrou na call** <#${newState.channelId}>`).setTimestamp()] });
  } else if (oldState.channelId && !newState.channelId) {
    await channel.send({ embeds: [new EmbedBuilder().setColor("#e74c3c").setDescription(`${e.negativo} ${member.user} **saiu da call** <#${oldState.channelId}>`).setTimestamp()] });
  }
});

// EVENTO DE BOAS-VINDAS
client.on('guildMemberAdd', async (member) => {
  const canais = await db.get(`welcome_channels_${member.guild.id}`);
  if (!canais || !canais.length) return;

  const texto = (await db.get(`welcome_text_${member.guild.id}`)) || 'Seja bem-vindo(a), {user}!';
  const banner = await db.get(`welcome_banner_${member.guild.id}`);

  const embed = new EmbedBuilder()
    .setTitle(`Boas-vindas à ${member.guild.name}!`)
    .setColor("#2b2d31")
    .setDescription(texto.replace('{user}', `${member}`))
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();

  if (banner) embed.setImage(banner);

  for (const cId of canais) {
    const ch = member.guild.channels.cache.get(cId);
    if (ch) await ch.send({ content: `${member}`, embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
