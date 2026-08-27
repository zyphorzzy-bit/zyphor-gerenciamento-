const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  ActivityType
} = require("discord.js");

const fs = require("fs");
const express = require("express");

/* ================= CONFIG ================= */

const TOKEN = process.env.DISCORD_TOKEN;

const OWNERS = [
  "1521362851502227588",
  "1533306874513068093"
];

const SUPPORT = "https://discord.gg/uAaSXMkUg4";
const DB_FILE = "./database.json";

/* ================= EMOJIS ================= */

const E = {
  ativo: "<a:ativado:1534611985260609607>",
  desativado: "<a:desativado:1534611986539876463>",
  proibido: "<:Proibido:1534611991929290877>",
  protecao: "<:proteo:1534611994353602732>",
  alerta: "<:alerta:1534611993410015456>",
  arquivo: "<:arquivo:1539124693460713552>",
  aceitar: "<:aceitar:1539124696912756767>",
  recusar: "<:recusar:1539124698338566257>",
  link: "<:linkexterno:1539124690709385330>",
  config: "<:config:1534611990633250937>",
  gerenciar: "<:gerenciar:1540870215640809482>",
  perfil: "<:perfil:1540557352602705990>",
  id: "<:ID:1534611999085039786>",
  horario: "<:horrio:1534611997335883886>",
  user: "<:user:1539125800907968603>",
  posse: "<:passarposse:1539125801851813970>",
  suporte: "<:suporte:1539845832004870154>",
  avisos: "<:avisos:1539125781320433724>",
  seta: "<:setinha:1539125798462685316>",
  not: "<:not:1539815573981237388>",
  zyphor: "<:zyphor:1540096483276095621>",
  fechar: "<:fechar:1541318085435199569>",
  fixo: "<:fixo:1541318082574684240>"
};

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= DATABASE ================= */

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const db = {
      bots: {},
      panels: {}
    };

    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(db, null, 2)
    );

    return db;
  }

  try {
    return JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );
  } catch {
    return {
      bots: {},
      panels: {}
    };
  }
}

function saveDB(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2)
  );
}

/* ================= UTIL ================= */

function isOwner(id) {
  return OWNERS.includes(id);
}

function nextID(db) {
  let n = 1;

  while (
    db.bots[`Z-${String(n).padStart(2, "0")}`]
  ) {
    n++;
  }

  return `Z-${String(n).padStart(2, "0")}`;
}

function expiration(days) {
  const d = new Date();

  d.setDate(
    d.getDate() + Number(days)
  );

  return d.toLocaleDateString("pt-BR");
}

function expired(date) {
  if (!date) return false;

  const p = date.split("/");

  if (p.length !== 3) return false;

  const d = new Date(
    Number(p[2]),
    Number(p[1]) - 1,
    Number(p[0]),
    23,
    59,
    59
  );

  return Date.now() > d.getTime();
}

function userBots(userId) {
  const db = loadDB();

  return Object.values(db.bots).filter(
    b => b.cliente === userId
  );
}

/* ================= PUBLIC PANEL ================= */

function publicEmbed() {
  return new EmbedBuilder()
    .setTitle(`${E.zyphor} Zyphor Management`)
    .setDescription(
      `## ${E.gerenciar} Painel do Cliente\n\n` +

      `${E.gerenciar} **Meus Bots**\n` +
      `Consulte todos os bots vinculados à sua conta.\n\n` +

      `${E.perfil} **Meu Perfil**\n` +
      `Veja seu ID e quantidade de bots.\n\n` +

      `${E.posse} **Transferir Posse**\n` +
      `Solicite a transferência do seu bot para outro usuário.\n\n` +

      `${E.arquivo} **Remover Dados**\n` +
      `Solicite a remoção dos seus dados do gerenciamento.\n\n` +

      `${E.suporte} **Suporte**\n` +
      `Bots expirados podem ser renovados através do suporte.`
    )
    .setFooter({
      text: "Zyphor Management • Painel Público"
    });
}

function publicButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("meus_bots")
        .setLabel("Meus Bots")
        .setEmoji(E.gerenciar)
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("meu_perfil")
        .setLabel("Meu Perfil")
        .setEmoji(E.perfil)
        .setStyle(ButtonStyle.Secondary)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("transferir")
        .setLabel("Transferir Posse")
        .setEmoji(E.posse)
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("remover_dados")
        .setLabel("Remover Dados")
        .setEmoji(E.arquivo)
        .setStyle(ButtonStyle.Danger)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Suporte")
        .setEmoji(E.suporte)
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT)
    )
  ];
}

/* ================= ADMIN PANEL ================= */

function adminEmbed() {
  const db = loadDB();

  const bots = Object.values(db.bots);

  const ativos = bots.filter(
    b => b.status === "ativo"
  ).length;

  const expirados = bots.filter(
    b => b.status === "expirado"
  ).length;

  const clientes = new Set(
    bots.map(b => b.cliente)
  ).size;

  return new EmbedBuilder()
    .setTitle(`${E.zyphor} Zyphor Management`)
    .setDescription(
      `## ${E.config} Painel Administrativo\n\n` +

      `${E.gerenciar} **Bots:** ${bots.length}\n` +
      `${E.ativo} **Ativos:** ${ativos}\n` +
      `${E.desativado} **Expirados:** ${expirados}\n` +
      `${E.user} **Clientes:** ${clientes}\n\n` +

      `Use os botões abaixo para administrar os bots.`
    )
    .setFooter({
      text: "Zyphor Management • Administração"
    });
}

function adminButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("adm_adicionar")
        .setLabel("Adicionar Bot")
        .setEmoji(E.gerenciar)
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("adm_bots")
        .setLabel("Bots")
        .setEmoji(E.id)
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("adm_expirados")
        .setLabel("Expirações")
        .setEmoji(E.horario)
        .setStyle(ButtonStyle.Secondary)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("adm_clientes")
        .setLabel("Clientes")
        .setEmoji(E.user)
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("adm_stats")
        .setLabel("Estatísticas")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

/* ================= BOT EMBED ================= */

function botEmbed(bot) {
  const status =
    bot.status === "ativo"
      ? E.ativo
      : E.desativado;

  return new EmbedBuilder()
    .setTitle(`${E.gerenciar} ${bot.id}`)
    .setDescription(
      `${E.user} **Cliente:** <@${bot.cliente}>\n\n` +

      `${E.id} **ID do Bot:**\n` +
      `\`${bot.bot}\`\n\n` +

      `🏠 **Servidor:**\n` +
      `\`${bot.servidor}\`\n\n` +

      `${E.horario} **Expiração:**\n` +
      `**${bot.expira}**\n\n` +

      `${status} **Status:** ${bot.status}`
    )
    .setFooter({
      text: "Zyphor Management"
    });
}

/* ================= TÓPICO ================= */

async function createThread(channel, bot) {
  if (!channel) return null;

  try {
    const thread = await channel.threads.create({
      name: `${bot.id} • Gerenciamento`,
      autoArchiveDuration: 10080,
      reason: `Gerenciamento ${bot.id}`
    });

    await thread.send({
      embeds: [botEmbed(bot)]
    });

    return thread;

  } catch (err) {
    console.error(
      `${E.proibido} Erro ao criar tópico:`,
      err
    );

    return null;
  }
}

/* ================= COMMANDS ================= */

const commands = [

  new SlashCommandBuilder()
    .setName("z-painel")
    .setDescription("Publica o painel público.")
    .addChannelOption(o =>
      o
        .setName("canal")
        .setDescription("Canal do painel.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("z-painel-adm")
    .setDescription("Publica o painel administrativo.")
    .addChannelOption(o =>
      o
        .setName("canal")
        .setDescription("Canal do painel ADM.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
];

/* ================= READY ================= */

client.once("ready", async () => {

  console.log(
    `${E.ativo} ${client.user.tag} online!`
  );

  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: "Zyphor Management",
        type: ActivityType.Streaming,
        url: "https://www.twitch.tv/zyphor"
      }
    ]
  });

  try {
    await client.application.commands.set(
      commands.map(c => c.toJSON())
    );

    console.log(
      `${E.ativo} Comandos registrados!`
    );

  } catch (err) {
    console.error(
      `${E.proibido} Erro ao registrar comandos:`,
      err
    );
  }
});

/* ================= SLASH ================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) {
    return;
  }

  /* -------- PAINEL PÚBLICO -------- */

  if (interaction.commandName === "z-painel") {

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${E.proibido} Apenas os owners podem publicar o painel.`,
        ephemeral: true
      });
    }

    const channel =
      interaction.options.getChannel("canal");

    try {

      const msg = await channel.send({
        embeds: [publicEmbed()],
        components: publicButtons()
      });

      try {
        await msg.pin();
      } catch {}

      return interaction.reply({
        content:
          `${E.ativo} Painel público enviado e fixado em ${channel}.`,
        ephemeral: true
      });

    } catch (err) {

      console.error(err);

      return interaction.reply({
        content:
          `${E.proibido} Não consegui enviar o painel.`,
        ephemeral: true
      });
    }
  }

  /* -------- PAINEL ADM -------- */

  if (interaction.commandName === "z-painel-adm") {

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${E.proibido} Você não possui permissão.`,
        ephemeral: true
      });
    }

    const channel =
      interaction.options.getChannel("canal");

    try {

      const msg = await channel.send({
        embeds: [adminEmbed()],
        components: adminButtons()
      });

      try {
        await msg.pin();
      } catch {}

      return interaction.reply({
        content:
          `${E.ativo} Painel ADM enviado e fixado em ${channel}.`,
        ephemeral: true
      });

    } catch (err) {

      console.error(err);

      return interaction.reply({
        content:
          `${E.proibido} Não consegui enviar o painel ADM.`,
        ephemeral: true
      });
    }
  }
});

/* ================= BOTÕES ================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) {
    return;
  }

  /* -------- MEUS BOTS -------- */

  if (interaction.customId === "meus_bots") {

    const bots =
      userBots(interaction.user.id);

    if (!bots.length) {
      return interaction.reply({
        content:
          `${E.proibido} Você não possui bots vinculados.`,
        ephemeral: true
      });
    }

    const text = bots.map(bot => {

      const status =
        bot.status === "ativo"
          ? E.ativo
          : E.desativado;

      return (
        `${E.gerenciar} **${bot.id}**\n` +
        `${status} Status: **${bot.status}**\n` +
        `${E.id} Bot: \`${bot.bot}\`\n` +
        `🏠 Servidor: \`${bot.servidor}\`\n` +
        `${E.horario} Expiração: **${bot.expira}**`
      );

    }).join("\n\n");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${E.gerenciar} Meus Bots`)
          .setDescription(text)
      ],
      ephemeral: true
    });
  }

  /* -------- PERFIL -------- */

  if (interaction.customId === "meu_perfil") {

    const bots =
      userBots(interaction.user.id);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${E.perfil} Meu Perfil`)
          .setDescription(
            `${E.user} **Usuário:** <@${interaction.user.id}>\n` +
            `${E.id} **ID:** \`${interaction.user.id}\`\n\n` +
            `${E.gerenciar} **Bots:** ${bots.length}`
          )
      ],
      ephemeral: true
    });
  }

  /* -------- REMOVER DADOS -------- */

  if (interaction.customId === "remover_dados") {

    const db = loadDB();

    let total = 0;

    for (const [id, bot] of Object.entries(db.bots)) {

      if (bot.cliente === interaction.user.id) {
        delete db.bots[id];
        total++;
      }
    }

    saveDB(db);

    return interaction.reply({
      content:
        `${E.ativo} Solicitação concluída.\n\n` +
        `${E.arquivo} Registros removidos: **${total}**`,
      ephemeral: true
    });
  }

  /* -------- TRANSFERIR POSSE -------- */

  if (interaction.customId === "transferir") {

    const modal = new ModalBuilder()
      .setCustomId("modal_transferir")
      .setTitle("Transferir Posse");

    const bot = new TextInputBuilder()
      .setCustomId("bot")
      .setLabel("Código do bot")
      .setPlaceholder("Z-01")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const novoDono = new TextInputBuilder()
      .setCustomId("novo_dono")
      .setLabel("ID do novo dono")
      .setPlaceholder("ID do usuário")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bot),
      new ActionRowBuilder().addComponents(novoDono)
    );

    return interaction.showModal(modal);
  }

  /* -------- SEGURANÇA ADM -------- */

  if (interaction.customId.startsWith("adm_")) {

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${E.proibido} Apenas os owners podem usar isso.`,
        ephemeral: true
      });
    }
  }

  /* -------- ADICIONAR -------- */

  if (interaction.customId === "adm_adicionar") {

    const modal = new ModalBuilder()
      .setCustomId("modal_adicionar")
      .setTitle("Adicionar Bot");

    const cliente = new TextInputBuilder()
      .setCustomId("cliente")
      .setLabel("ID do cliente")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const bot = new TextInputBuilder()
      .setCustomId("bot")
      .setLabel("ID do bot")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const servidor = new TextInputBuilder()
      .setCustomId("servidor")
      .setLabel("ID do servidor")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const dias = new TextInputBuilder()
      .setCustomId("dias")
      .setLabel("Dias de validade")
      .setPlaceholder("30")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(cliente),
      new ActionRowBuilder().addComponents(bot),
      new ActionRowBuilder().addComponents(servidor),
      new ActionRowBuilder().addComponents(dias)
    );

    return interaction.showModal(modal);
  }

  /* -------- BOTS ADM -------- */

  if (interaction.customId === "adm_bots") {

    const db = loadDB();
    const bots = Object.values(db.bots);

    if (!bots.length) {
      return interaction.reply({
        content:
          `${E.proibido} Nenhum bot cadastrado.`,
        ephemeral: true
      });
    }

    const text = bots.slice(0, 20).map(bot => {

      return (
        `${E.gerenciar} **${bot.id}**\n` +
        `${E.user} <@${bot.cliente}>\n` +
        `${E.id} \`${bot.bot}\`\n` +
        `${E.horario} ${bot.expira}\n` +
        `${bot.status === "ativo" ? E.ativo : E.desativado} ${bot.status}`
      );

    }).join("\n\n");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${E.gerenciar} Bots cadastrados`)
          .setDescription(text)
      ],
      ephemeral: true
    });
  }

  /* -------- EXPIRAÇÕES -------- */

  if (interaction.customId === "adm_expirados") {

    const db = loadDB();
    const bots = Object.values(db.bots);

    const ativos =
      bots.filter(
        b => b.status === "ativo"
      ).length;

    const expirados =
      bots.filter(
        b => b.status === "expirado"
      ).length;

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${E.horario} Expirações`)
          .setDescription(
            `${E.ativo} **Ativos:** ${ativos}\n` +
            `${E.desativado} **Expirados:** ${expirados}\n\n` +
            `${E.suporte} Renovação:\n${SUPPORT}`
          )
      ],
      ephemeral: true
    });
  }

  /* -------- CLIENTES -------- */

  if (interaction.customId === "adm_clientes") {

    const db = loadDB();

    const clients =
      new Set(
        Object.values(db.bots)
          .map(b => b.cliente)
      );

    return interaction.reply({
      content:
        `${E.user} Clientes cadastrados: **${clients.size}**`,
      ephemeral: true
    });
  }

  /* -------- STATS -------- */

  if (interaction.customId === "adm_stats") {

    const db = loadDB();
    const bots = Object.values(db.bots);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📊 Estatísticas")
          .setDescription(
            `🤖 **Bots:** ${bots.length}\n` +
            `${E.ativo} **Ativos:** ${
              bots.filter(
                b => b.status === "ativo"
              ).length
            }\n` +
            `${E.desativado} **Expirados:** ${
              bots.filter(
                b => b.status === "expirado"
              ).length
            }`
          )
      ],
      ephemeral: true
    });
  }
});

/* ================= MODAIS ================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isModalSubmit()) {
    return;
  }

  /* -------- ADICIONAR BOT -------- */

  if (interaction.customId === "modal_adicionar") {

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${E.proibido} Sem permissão.`,
        ephemeral: true
      });
    }

    const cliente =
      interaction.fields
        .getTextInputValue("cliente")
        .trim();

    const botID =
      interaction.fields
        .getTextInputValue("bot")
        .trim();

    const servidor =
      interaction.fields
        .getTextInputValue("servidor")
        .trim();

    const dias =
      Number(
        interaction.fields
          .getTextInputValue("dias")
          .trim()
      );

    if (!/^\d{17,20}$/.test(cliente)) {
      return interaction.reply({
        content:
          `${E.proibido} ID do cliente inválido.`,
        ephemeral: true
      });
    }

    if (!/^\d{17,20}$/.test(botID)) {
      return interaction.reply({
        content:
          `${E.proibido} ID do bot inválido.`,
        ephemeral: true
      });
    }

    if (!/^\d{17,20}$/.test(servidor)) {
      return interaction.reply({
        content:
          `${E.proibido} ID do servidor inválido.`,
        ephemeral: true
      });
    }

    if (!Number.isInteger(dias) || dias <= 0) {
      return interaction.reply({
        content:
          `${E.proibido} Dias inválidos.`,
        ephemeral: true
      });
    }

    const db = loadDB();

    const id = nextID(db);
    const expira = expiration(dias);

    const data = {
      id,
      cliente,
      bot: botID,
      servidor,
      dias,
      expira,
      status: "ativo",
      criado: new Date().toISOString(),
      thread: null
    };

    db.bots[id] = data;
    saveDB(db);

    const thread =
      await createThread(
        interaction.channel,
        data
      );

    if (thread) {
      db.bots[id].thread = thread.id;
      saveDB(db);
    }

    try {

      const user =
        await client.users.fetch(cliente);

      await user.send(
        `${E.ativo} **Seu bot foi cadastrado!**\n\n` +
        `${E.gerenciar} Código: **${id}**\n` +
        `${E.id} Bot: \`${botID}\`\n` +
        `🏠 Servidor: \`${servidor}\`\n` +
        `${E.horario} Expiração: **${expira}**\n\n` +
        `${E.suporte} Suporte:\n${SUPPORT}`
      );

    } catch {}

    return interaction.reply({
      content:
        `${E.ativo} **Bot cadastrado!**\n\n` +
        `${E.gerenciar} Código: **${id}**\n` +
        `${E.user} Cliente: <@${cliente}>\n` +
        `${E.id} Bot: \`${botID}\`\n` +
        `🏠 Servidor: \`${servidor}\`\n` +
        `${E.horario} Expiração: **${expira}**`,
      ephemeral: true
    });
  }

  /* -------- TRANSFERÊNCIA -------- */

  if (interaction.customId === "modal_transferir") {

    const codigo =
      interaction.fields
        .getTextInputValue("bot")
        .trim()
        .toUpperCase();

    const novoDono =
      interaction.fields
        .getTextInputValue("novo_dono")
        .trim();

    if (!/^\d{17,20}$/.test(novoDono)) {
      return interaction.reply({
        content:
          `${E.proibido} ID do novo dono inválido.`,
        ephemeral: true
      });
    }

    const db = loadDB();
    const bot = db.bots[codigo];

    if (!bot) {
      return interaction.reply({
        content:
          `${E.proibido} Bot **${codigo}** não encontrado.`,
        ephemeral: true
      });
    }

    if (
      bot.cliente !== interaction.user.id &&
      !isOwner(interaction.user.id)
    ) {
      return interaction.reply({
        content:
          `${E.proibido} Você não é o dono desse bot.`,
        ephemeral: true
      });
    }

    bot.cliente = novoDono;

    saveDB(db);

    try {

      const user =
        await client.users.fetch(novoDono);

      await user.send(
        `${E.posse} **Um bot foi transferido para você.**\n\n` +
        `${E.gerenciar} Bot: **${codigo}**\n` +
        `${E.id} ID: \`${bot.bot}\`\n` +
        `${E.horario} Expiração: **${bot.expira}**`
      );

    } catch {}

    return interaction.reply({
      content:
        `${E.ativo} A posse do **${codigo}** foi transferida para <@${novoDono}>.`,
      ephemeral: true
    });
  }
});

/* ================= EXPIRAÇÃO ================= */

async function checkExpiration() {

  const db = loadDB();
  let changed = false;

  for (const bot of Object.values(db.bots)) {

    if (bot.status === "expirado") {
      continue;
    }

    if (!expired(bot.expira)) {
      continue;
    }

    bot.status = "expirado";
    changed = true;

    try {

      const user =
        await client.users.fetch(bot.cliente);

      await user.send(
        `${E.desativado} **Seu bot ${bot.id} expirou.**\n\n` +
        `${E.horario} Expiração: **${bot.expira}**\n\n` +
        `${E.suporte} Para renovar, abra um atendimento:\n` +
        `${SUPPORT}\n\n` +
        `Informe o código **${bot.id}**.`
      );

    } catch {}

    if (bot.thread) {

      try {

        const thread =
          await client.channels.fetch(
            bot.thread
          );

        if (thread) {
          await thread.send(
            `${E.desativado} **${bot.id} expirou.**\n` +
            `${E.horario} Data: **${bot.expira}**\n` +
            `${E.suporte} Renovação: ${SUPPORT}`
          );
        }

      } catch {}
    }
  }

  if (changed) {
    saveDB(db);
  }
}

setInterval(
  checkExpiration,
  60 * 1000
);

/* ================= WEB SERVER ================= */

const app = express();

app.get("/", (req, res) => {
  res.send("Zyphor Management online.");
});

app.get("/health", (req, res) => {
  res.json({
    online: true,
    bot: client.user
      ? client.user.tag
      : null,
    uptime: process.uptime()
  });
});

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `${E.ativo} Web server online na porta ${PORT}.`
  );
});

/* ================= TOKEN ================= */

if (!TOKEN) {
  console.error(
    `${E.proibido} DISCORD_TOKEN não foi encontrado.`
  );

  process.exit(1);
}

/* ================= LOGIN ================= */

client.login(TOKEN).catch(err => {

  console.error(
    `${E.proibido} Falha ao conectar no Discord:`
  );

  console.error(err);
});
