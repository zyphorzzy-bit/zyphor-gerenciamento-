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

const express = require("express");
const fs = require("fs");

const config = require("./config.json");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DB_FILE = "./database.json";

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

function owner(id) {
  return config.owners.includes(id);
}

function nextBotID(db) {
  let n = Object.keys(db.bots).length + 1;

  while (
    db.bots[`Z-${String(n).padStart(2, "0")}`]
  ) {
    n++;
  }

  return `Z-${String(n).padStart(2, "0")}`;
}

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

const SUPPORT = "https://discord.gg/uAaSXMkUg4";

/* =========================
   COMANDOS
========================= */

const commands = [

  new SlashCommandBuilder()
    .setName("z-painel")
    .setDescription("Publica o painel de clientes.")
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription("Canal onde o painel será publicado.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("z-painel-adm")
    .setDescription("Abre o painel administrativo.")
];

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
      `Cada usuário possui acesso somente às informações ` +
      `dos seus próprios bots.`
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

  const active =
    bots.filter(b => b.status === "ativo").length;

  const expired =
    bots.filter(b => b.status === "expirado").length;

  return new EmbedBuilder()
    .setTitle(`${E.zyphor} Zyphor Management`)
    .setDescription(
      `## ${E.config} Painel Administrativo\n\n` +

      `${E.gerenciar} Bots cadastrados: **${bots.length}**\n` +
      `${E.ativo} Ativos: **${active}**\n` +
      `${E.desativado} Expirados: **${expired}**`
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
   TÓPICO DO BOT
========================= */

async function createBotThread(guild, bot) {

  if (!config.adminChannel)
    return null;

  const channel =
    guild.channels.cache.get(
      config.adminChannel
    );

  if (!channel || !channel.isTextBased())
    return null;

  const thread = await channel.threads.create({
    name: `${bot.id} • ${bot.cliente}`,
    autoArchiveDuration: 10080,
    reason: `Gerenciamento ${bot.id}`
  });

  bot.thread = thread.id;

  const embed = botEmbed(bot);

  await thread.send({
    embeds: [embed]
  });

  return thread;
}

function botEmbed(bot) {

  return new EmbedBuilder()
    .setTitle(`${E.gerenciar} ${bot.id}`)
    .setDescription(
      `${E.user} **Cliente:** <@${bot.cliente}>\n` +
      `${E.id} **Bot:** \`${bot.bot}\`\n` +
      `🏠 **Servidor:** \`${bot.servidor}\`\n` +
      `${E.horario} **Expiração:** ${bot.expira}\n\n` +

      `${bot.status === "ativo"
        ? E.ativo
        : E.desativado
      } **Status:** ${bot.status}`
    )
    .setFooter({
      text: "Zyphor Management • Registro do Bot"
    });
}

async function updateThread(bot) {

  if (!bot.thread)
    return;

  for (const guild of client.guilds.cache.values()) {

    const thread =
      guild.channels.cache.get(bot.thread);

    if (!thread)
      continue;

    const messages =
      await thread.messages.fetch({ limit: 10 });

    const old =
      messages.find(m =>
        m.author.id === client.user.id &&
        m.embeds.length
      );

    if (old) {
      await old.edit({
        embeds: [botEmbed(bot)]
      });
    }

    break;
  }
}

/* =========================
   ONLINE
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
      `${E.proibido} Erro nos comandos:`,
      err
    );
  }
});

/* =========================
   COMMANDS
========================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand())
    return;

  /* Z-PAINEL */

  if (interaction.commandName === "z-painel") {

    if (!owner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${E.proibido} Apenas owners podem publicar o painel.`,
        ephemeral: true
      });
    }

    const channel =
      interaction.options.getChannel("canal");

    try {

      const message =
        await channel.send({
          embeds: [publicEmbed()],
          components: [publicButtons()]
        });

      await message.pin().catch(() => {});

      return interaction.reply({
        content:
          `${E.ativo} Painel publicado e fixado em ${channel}.`,
        ephemeral: true
      });

    } catch (err) {

      console.error(err);

      return interaction.reply({
        content:
          `${E.proibido} Não consegui enviar o painel nesse canal. Verifique as permissões do bot.`,
        ephemeral: true
      });
    }
  }

  /* ADM */

  if (interaction.commandName === "z-painel-adm") {

    if (!owner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${E.proibido} Você não possui acesso ao painel administrativo.`,
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [adminEmbed()],
      components: adminButtons(),
      ephemeral: true
    });
  }
});

/* =========================
   BOTÕES
========================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton())
    return;

  /* =========================
     CLIENTE
  ========================= */

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

    const text = bots.map(bot =>
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
          .setDescription(text)
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
            `${E.gerenciar} **Bots:** ${bots.length}`
          )
      ],
      ephemeral: true
    });
  }

  /* =========================
     ADMIN
  ========================= */

  if (
    interaction.customId.startsWith("adm_") &&
    !owner(interaction.user.id)
  ) {
    return interaction.reply({
      content: `${E.proibido} Sem permissão.`,
      ephemeral: true
    });
  }

  /* ADICIONAR */

  if (interaction.customId === "adm_add") {

    const modal = new ModalBuilder()
      .setCustomId("add_bot_modal")
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

    const text = bots.slice(0, 20).map(bot =>
      `${E.gerenciar} **${bot.id}** • ${bot.status}\n` +
      `${E.user} <@${bot.cliente}> • ` +
      `${E.horario} ${bot.expira}`
    ).join("\n\n");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${E.gerenciar} Bots cadastrados`)
          .setDescription(text)
      ],
      ephemeral: true
    });
  }

  /* EXPIRAÇÕES */

  if (interaction.customId === "adm_exp") {

    const db = loadDB();
    const bots = Object.values(db.bots);

    const active =
      bots.filter(b => b.status === "ativo").length;

    const expired =
      bots.filter(b => b.status === "expirado").length;

    return interaction.reply({
      content:
        `${E.horario} **Expirações**\n\n` +
        `${E.ativo} Ativos: **${active}**\n` +
        `${E.desativado} Expirados: **${expired}**`,
      ephemeral: true
    });
  }

  /* CLIENTES */

  if (interaction.customId === "adm_clients") {

    const db = loadDB();

    const clients =
      new Set(
        Object.values(db.bots)
          .map(b => b.cliente)
      );

    return interaction.reply({
      content:
        `${E.perfil} Clientes: **${clients.size}**`,
      ephemeral: true
    });
  }

  /* STATS */

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

  if (interaction.customId !== "add_bot_modal")
    return;

  if (!owner(interaction.user.id))
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
        `${E.proibido} Quantidade de dias inválida.`,
      ephemeral: true
    });
  }

  const db = loadDB();

  const id = nextBotID(db);

  const date = new Date();

  date.setDate(
    date.getDate() + dias
  );

  const expira =
    date.toLocaleDateString("pt-BR");

  const bot = {

    id,

    cliente,

    bot: botID,

    servidor,

    dias,

    expira,

    criado:
      new Date().toISOString(),

    status: "ativo",

    thread: null,

    historico: [
      {
        acao: "Bot cadastrado",
        por: interaction.user.id,
        data: new Date().toISOString()
      }
    ]
  };

  db.bots[id] = bot;

  saveDB(db);

  /* CRIA TÓPICO */

  try {

    const thread =
      await createBotThread(
        interaction.guild,
        bot
      );

    if (thread) {

      db.bots[id].thread =
        thread.id;

      saveDB(db);
    }

  } catch (err) {

    console.error(
      "Erro ao criar tópico:",
      err
    );
  }

  return interaction.reply({
    content:
      `${E.ativo} **Bot cadastrado!**\n\n` +
      `${E.gerenciar} ID: **${id}**\n` +
      `${E.user} Cliente: <@${cliente}>\n` +
      `${E.id} Bot: \`${botID}\`\n` +
      `🏠 Servidor: \`${servidor}\`\n` +
      `${E.horario} Expira: **${expira}**`,
    ephemeral: true
  });
});

/* =========================
   EXPIRAÇÃO AUTOMÁTICA
========================= */

setInterval(async () => {

  const db = loadDB();
  let changed = false;

  for (const bot of Object.values(db.bots)) {

    if (bot.status === "expirado")
      continue;

    const parts =
      bot.expira.split("/");

    if (parts.length !== 3)
      continue;

    const expiration =
      new Date(
        Number(parts[2]),
        Number(parts[1]) - 1,
        Number(parts[0]),
        23,
        59,
        59
      );

    if (Date.now() > expiration.getTime()) {

      bot.status = "expirado";

      bot.historico.push({
        acao: "Bot expirado",
        data: new Date().toISOString()
      });

      changed = true;

      /* DM */

      try {

        const user =
          await client.users.fetch(
            bot.cliente
          );

        await user.send(
          `${E.desativado} **Seu bot ${bot.id} expirou.**\n\n` +
          `Para solicitar a renovação, entre no suporte:\n` +
          `${SUPPORT}`
        );

      } catch {}
    }
  }

  if (changed)
    saveDB(db);

}, 60 * 1000);

/* =========================
   REMOÇÃO DE DADOS
========================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton())
    return;

  if (interaction.customId !== "delete_data")
    return;

  const db = loadDB();

  let removed = 0;

  for (const [id, bot] of Object.entries(db.bots)) {

    if (bot.cliente === interaction.user.id) {

      delete db.bots[id];
      removed++;
    }
  }

  saveDB(db);

  return interaction.reply({
    content:
      `${E.ativo} Seus dados vinculados aos bots foram removidos.\n\n` +
      `Registros removidos: **${removed}**`,
    ephemeral: true
  });
});

/* =========================
   SERVIDOR WEB RAILWAY
========================= */

const app = express();

app.get("/", (req, res) => {
  res.send("Zyphor Management online.");
});

app.get("/oauth/callback", (req, res) => {
  res.send(
    "Autenticação recebida. Você pode voltar ao Discord."
  );
});

app.listen(
  process.env.PORT || 3000,
  () => console.log("Web server online.")
);

/* =========================
   LOGIN
========================= */

client.login(process.env.TOKEN);
