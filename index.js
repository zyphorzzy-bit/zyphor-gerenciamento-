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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   CONFIG
========================= */

const OWNERS = [
  "1521362851502227588",
  "1533306874513068093"
];

const SUPPORT =
  "https://discord.gg/uAaSXMkUg4";

const DB_FILE = "./database.json";

/* =========================
   EMOJIS
========================= */

const E = {
  ativo: "<a:ativado:1534611985260609607>",
  desativado: "<a:desativado:1534611986539876463>",
  proibido: "<:Proibido:1534611991929290877>",
  config: "<:config:1534611990633250937>",
  gerenciar: "<:gerenciar:1540870215640809482>",
  perfil: "<:perfil:1540557352602705990>",
  id: "<:ID:1534611999085039786>",
  horario: "<:horrio:1534611997335883886>",
  user: "<:user:1539125800907968603>",
  posse: "<:passarposse:1539125801851813970>",
  avisos: "<:avisos:1539125781320433724>",
  zyphor: "<:zyphor:1540096483276095621>"
};

function isOwner(id) {
  return OWNERS.includes(id);
}

/* =========================
   DATABASE
========================= */

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ bots: {} }, null, 2)
    );
  }

  try {
    return JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );
  } catch {
    return { bots: {} };
  }
}

function saveDB(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2)
  );
}

function nextBotID(db) {
  let n = 1;

  while (
    db.bots[`Z-${String(n).padStart(2, "0")}`]
  ) {
    n++;
  }

  return `Z-${String(n).padStart(2, "0")}`;
}

/* =========================
   PAINEL PÚBLICO
========================= */

function publicEmbed() {
  return new EmbedBuilder()
    .setTitle(`${E.zyphor} Zyphor Management`)
    .setDescription(
      `## ${E.gerenciar} Gerencie seus bots\n\n` +
      `Consulte os bots vinculados à sua conta ` +
      `diretamente pelo painel.\n\n` +

      `${E.gerenciar} **Meus Bots**\n` +
      `Veja seus bots, servidores, status e expiração.\n\n` +

      `${E.perfil} **Meu Perfil**\n` +
      `Veja sua conta e os bots vinculados.\n\n` +

      `${E.avisos} **Aviso**\n` +
      `Você só poderá visualizar os bots vinculados à sua conta.`
    )
    .setFooter({
      text: "Zyphor Management • Painel do Cliente"
    });
}

function publicButtons() {
  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId("my_bots")
      .setLabel("Meus Bots")
      .setEmoji("1540870215640809482")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("my_profile")
      .setLabel("Meu Perfil")
      .setEmoji("1540557352602705990")
      .setStyle(ButtonStyle.Secondary)
  );
}

/* =========================
   PAINEL ADM
========================= */

function adminEmbed() {

  const db = loadDB();
  const bots = Object.values(db.bots);

  const ativos =
    bots.filter(b => b.status === "ativo").length;

  const expirados =
    bots.filter(b => b.status === "expirado").length;

  return new EmbedBuilder()
    .setTitle(`${E.zyphor} Zyphor Management`)
    .setDescription(
      `## ${E.config} Painel Administrativo\n\n` +

      `${E.gerenciar} **Bots cadastrados:** ${bots.length}\n` +
      `${E.ativo} **Bots ativos:** ${ativos}\n` +
      `${E.desativado} **Bots expirados:** ${expirados}\n\n` +

      `Use os botões abaixo para administrar o sistema.`
    )
    .setFooter({
      text: "Zyphor Management • Administração"
    });
}

function adminButtons() {

  return [

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("adm_add")
        .setLabel("Adicionar Bot")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("adm_list")
        .setLabel("Bots")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("adm_exp")
        .setLabel("Expirações")
        .setStyle(ButtonStyle.Secondary)
    ),

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("adm_clients")
        .setLabel("Clientes")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("adm_stats")
        .setLabel("Estatísticas")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

/* =========================
   COMANDOS
========================= */

const commands = [

  new SlashCommandBuilder()
    .setName("z-painel")
    .setDescription("Publica o painel público.")
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription("Canal onde o painel será publicado.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("z-painel-adm")
    .setDescription("Publica o painel administrativo.")
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription("Canal onde o painel ADM será publicado.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
];

/* =========================
   BOT ONLINE
========================= */

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
      `${E.proibido} Erro ao registrar comandos:",
      err
    );
  }
});

/* =========================
   SLASH COMMANDS
========================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand())
    return;

  /* ---------- PÚBLICO ---------- */

  if (interaction.commandName === "z-painel") {

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${E.proibido} Apenas os owners podem publicar o painel.`,
        ephemeral: true
      });
    }

    const canal =
      interaction.options.getChannel("canal");

    try {

      const mensagem =
        await canal.send({
          embeds: [publicEmbed()],
          components: [publicButtons()]
        });

      await mensagem.pin().catch(() => {});

      return interaction.reply({
        content:
          `${E.ativo} Painel público enviado e fixado em ${canal}.`,
        ephemeral: true
      });

    } catch (err) {

      console.error(err);

      return interaction.reply({
        content:
          `${E.proibido} Não consegui enviar o painel. Verifique minhas permissões nesse canal.`,
        ephemeral: true
      });
    }
  }

  /* ---------- ADM ---------- */

  if (interaction.commandName === "z-painel-adm") {

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${E.proibido} Apenas os owners podem publicar o painel ADM.`,
        ephemeral: true
      });
    }

    const canal =
      interaction.options.getChannel("canal");

    try {

      const mensagem =
        await canal.send({
          embeds: [adminEmbed()],
          components: adminButtons()
        });

      await mensagem.pin().catch(() => {});

      return interaction.reply({
        content:
          `${E.ativo} Painel ADM enviado e fixado em ${canal}.`,
        ephemeral: true
      });

    } catch (err) {

      console.error(err);

      return interaction.reply({
        content:
          `${E.proibido} Não consegui enviar o painel ADM. Verifique se tenho **Ver Canal, Enviar Mensagens, Incorporar Links e Gerenciar Mensagens**.`,
        ephemeral: true
      });
    }
  }
});

/* =========================
   BOTÕES
========================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton())
    return;

  /* MEUS BOTS */

  if (interaction.customId === "my_bots") {

    const db = loadDB();

    const bots =
      Object.values(db.bots)
        .filter(b =>
          b.cliente === interaction.user.id
        );

    if (!bots.length) {

      return interaction.reply({
        content:
          `${E.proibido} Nenhum bot está vinculado à sua conta.`,
        ephemeral: true
      });
    }

    const texto = bots.map(bot =>
      `${E.gerenciar} **${bot.id}**\n` +
      `${bot.status === "ativo"
        ? E.ativo
        : E.desativado
      } Status: **${bot.status}**\n` +
      `${E.id} Bot: \`${bot.bot}\`\n` +
      `🏠 Servidor: \`${bot.servidor}\`\n` +
      `${E.horario} Expira: **${bot.expira}**`
    ).join("\n\n");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${E.gerenciar} Meus Bots`)
          .setDescription(texto)
      ],
      ephemeral: true
    });
  }

  /* PERFIL */

  if (interaction.customId === "my_profile") {

    const db = loadDB();

    const bots =
      Object.values(db.bots)
        .filter(b =>
          b.cliente === interaction.user.id
        );

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${E.perfil} Meu Perfil`)
          .setDescription(
            `${E.user} **Usuário:** <@${interaction.user.id}>\n` +
            `${E.id} **ID:** \`${interaction.user.id}\`\n\n` +
            `${E.gerenciar} **Bots vinculados:** ${bots.length}`
          )
      ],
      ephemeral: true
    });
  }

  /* ADM */

  if (
    interaction.customId.startsWith("adm_") &&
    !isOwner(interaction.user.id)
  ) {
    return interaction.reply({
      content:
        `${E.proibido} Você não possui permissão.`,
      ephemeral: true
    });
  }

  /* ADICIONAR */

  if (interaction.customId === "adm_add") {

    const modal = new ModalBuilder()
      .setCustomId("add_bot")
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

  /* LISTA */

  if (interaction.customId === "adm_list") {

    const db = loadDB();
    const bots = Object.values(db.bots);

    if (!bots.length) {
      return interaction.reply({
        content:
          `${E.proibido} Nenhum bot cadastrado.`,
        ephemeral: true
      });
    }

    const texto = bots
      .slice(0, 20)
      .map(bot =>
        `${E.gerenciar} **${bot.id}**\n` +
        `${E.user} <@${bot.cliente}>\n` +
        `${E.horario} ${bot.expira}\n` +
        `${bot.status === "ativo"
          ? E.ativo
          : E.desativado
        } ${bot.status}`
      )
      .join("\n\n");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${E.gerenciar} Bots cadastrados`)
          .setDescription(texto)
      ],
      ephemeral: true
    });
  }

  /* EXPIRAÇÕES */

  if (interaction.customId === "adm_exp") {

    const db = loadDB();
    const bots = Object.values(db.bots);

    const ativos =
      bots.filter(b => b.status === "ativo").length;

    const expirados =
      bots.filter(b => b.status === "expirado").length;

    return interaction.reply({
      content:
        `${E.horario} **Expirações**\n\n` +
        `${E.ativo} Ativos: **${ativos}**\n` +
        `${E.desativado} Expirados: **${expirados}**`,
      ephemeral: true
    });
  }

  /* CLIENTES */

  if (interaction.customId === "adm_clients") {

    const db = loadDB();

    const clientes =
      new Set(
        Object.values(db.bots)
          .map(b => b.cliente)
      );

    return interaction.reply({
      content:
        `${E.perfil} Clientes cadastrados: **${clientes.size}**`,
      ephemeral: true
    });
  }

  /* ESTATÍSTICAS */

  if (interaction.customId === "adm_stats") {

    const db = loadDB();
    const bots = Object.values(db.bots);

    return interaction.reply({
      content:
        `📊 **Estatísticas**\n\n` +
        `🤖 Bots: **${bots.length}**\n` +
        `${E.ativo} Ativos: **${bots.filter(b => b.status === "ativo").length}**\n` +
        `${E.desativado} Expirados: **${bots.filter(b => b.status === "expirado").length}**`,
      ephemeral: true
    });
  }
});

/* =========================
   MODAL
========================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isModalSubmit())
    return;

  if (interaction.customId !== "add_bot")
    return;

  if (!isOwner(interaction.user.id))
    return;

  const cliente =
    interaction.fields.getTextInputValue("cliente");

  const botID =
    interaction.fields.getTextInputValue("bot");

  const servidor =
    interaction.fields.getTextInputValue("servidor");

  const dias =
    Number(
      interaction.fields.getTextInputValue("dias")
    );

  if (!Number.isInteger(dias) || dias <= 0) {

    return interaction.reply({
      content:
        `${E.proibido} Informe uma quantidade de dias válida.`,
      ephemeral: true
    });
  }

  const db = loadDB();

  const id = nextBotID(db);

  const data = new Date();

  data.setDate(
    data.getDate() + dias
  );

  const expira =
    data.toLocaleDateString("pt-BR");

  db.bots[id] = {

    id,

    cliente,

    bot: botID,

    servidor,

    dias,

    expira,

    status: "ativo",

    criado:
      new Date().toISOString(),

    historico: [
      {
        acao: "Bot cadastrado",
        por: interaction.user.id,
        data: new Date().toISOString()
      }
    ]
  };

  saveDB(db);

  return interaction.reply({
    content:
      `${E.ativo} **Bot cadastrado com sucesso!**\n\n` +
      `${E.gerenciar} ID: **${id}**\n` +
      `${E.user} Cliente: <@${cliente}>\n` +
      `${E.id} Bot: \`${botID}\`\n` +
      `🏠 Servidor: \`${servidor}\`\n` +
      `${E.horario} Expiração: **${expira}**`,
    ephemeral: true
  });
});

/* =========================
   EXPIRAÇÃO
========================= */

setInterval(async () => {

  const db = loadDB();

  let mudou = false;

  for (const bot of Object.values(db.bots)) {

    if (bot.status === "expirado")
      continue;

    const partes =
      bot.expira.split("/");

    if (partes.length !== 3)
      continue;

    const data =
      new Date(
        Number(partes[2]),
        Number(partes[1]) - 1,
        Number(partes[0]),
        23,
        59,
        59
      );

    if (Date.now() > data.getTime()) {

      bot.status = "expirado";

      bot.historico =
        bot.historico || [];

      bot.historico.push({
        acao: "Bot expirado",
        data: new Date().toISOString()
      });

      mudou = true;

      try {

        const user =
          await client.users.fetch(bot.cliente);

        await user.send(
          `${E.desativado} **Seu ${bot.id} expirou.**\n\n` +
          `Caso queira renovar, entre no suporte:\n` +
          `${SUPPORT}`
        );

      } catch {}
    }
  }

  if (mudou)
    saveDB(db);

}, 60000);

/* =========================
   WEB SERVER
========================= */

const app = express();

app.get("/", (req, res) => {
  res.send("Zyphor Management online.");
});

app.listen(
  process.env.PORT || 3000,
  () => console.log(
    `${E.ativo} Web server online!`
  )
);

/* =========================
   LOGIN
========================= */

if (!process.env.TOKEN) {
  console.error(
    `${E.proibido} TOKEN não configurado no Railway.`
  );
  process.exit(1);
}

client.login(process.env.TOKEN);
