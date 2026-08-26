const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType
} = require("discord.js");

const fs = require("fs");

const config = require("./config.json");
const DB_FILE = "./database.json";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const SUPORTE = "https://discord.gg/uAaSXMkUg4";

const e = {
  ativo: "<a:ativado:1534611985260609607>",
  desativado: "<a:desativado:1534611986539876463>",
  proibido: "<:Proibido:1534611991929290877>",
  zyphor: "<:zyphor:1540096483276095621>",
  gerenciar: "<:gerenciar:1540870215640809482>",
  perfil: "<:perfil:1540557352602705990>",
  avisos: "<:avisos:1539125781320433724>",
  suporte: "<:suporte:1539845832004870154>",
  id: "<:ID:1534611999085039786>",
  horario: "<:horrio:1534611997335883886>"
};

/* =========================
   BANCO
========================= */

function carregarDB() {
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

function salvarDB(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2)
  );
}

function isOwner(id) {
  return config.owners.includes(id);
}

/* =========================
   COMANDOS
========================= */

const comandos = [
  new SlashCommandBuilder()
    .setName("gerenciador")
    .setDescription("Abre o painel administrativo."),

  new SlashCommandBuilder()
    .setName("z-painel")
    .setDescription("Envia o painel público de gerenciamento.")
];

/* =========================
   BOT ONLINE
========================= */

client.once("ready", async () => {

  console.log(
    `${e.ativo} ${client.user.tag} online!`
  );

  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: "Zyphor Management",
        type: ActivityType.Streaming,
        url: "https://www.twitch.tv/"
      }
    ]
  });

  try {
    await client.application.commands.set(
      comandos.map(cmd => cmd.toJSON())
    );

    console.log(
      `${e.ativo} Comandos registrados!`
    );

  } catch (err) {
    console.error(
      `${e.proibido} Erro ao registrar comandos:`,
      err
    );
  }
});

/* =========================
   INTERAÇÕES
========================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand())
    return;

  /* =========================
     GERENCIADOR
  ========================= */

  if (interaction.commandName === "gerenciador") {

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${e.proibido} Apenas os owners podem usar este comando.`,
        ephemeral: true
      });
    }

    const db = carregarDB();
    const bots = Object.values(db.bots);

    const embed = new EmbedBuilder()
      .setTitle(`${e.zyphor} Zyphor Management`)
      .setDescription(
        `${e.gerenciar} **Painel Administrativo**\n\n` +
        `🤖 Bots cadastrados: **${bots.length}**\n` +
        `${e.ativo} Sistema: **Online**`
      )
      .setFooter({
        text: "Zyphor Management • Administrativo"
      });

    const row = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("admin_bots")
        .setLabel("Gerenciar Bots")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("admin_clientes")
        .setLabel("Clientes")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("admin_expiracoes")
        .setLabel("Expirações")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  /* =========================
     Z-PAINEL
  ========================= */

  if (interaction.commandName === "z-painel") {

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${e.proibido} Apenas os owners podem criar o painel.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${e.zyphor} Zyphor Management`)
      .setDescription(
        `## ${e.gerenciar} Gerencie seus bots\n\n` +
        `Acesse o painel abaixo para consultar os bots ` +
        `vinculados à sua conta.\n\n` +

        `${e.perfil} **Meus Bots**\n` +
        `Veja seus bots, status, servidor vinculado ` +
        `e data de expiração.\n\n` +

        `${e.avisos} **Aviso**\n` +
        `As informações exibidas pertencem somente ` +
        `aos bots vinculados à sua conta.`
      )
      .setFooter({
        text: "Zyphor Management • Painel do Cliente"
      });

    const row = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("meus_bots")
        .setLabel("Meus Bots")
        .setEmoji("1540870215640809482")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("meu_perfil")
        .setLabel("Meu Perfil")
        .setEmoji("1540557352602705990")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content:
        `${e.ativo} Painel enviado neste canal.`,
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

  /* MEUS BOTS */

  if (interaction.customId === "meus_bots") {

    const db = carregarDB();

    const bots = Object.values(db.bots)
      .filter(bot =>
        bot.cliente === interaction.user.id
      );

    if (!bots.length) {
      return interaction.reply({
        content:
          `${e.proibido} Você não possui bots vinculados à sua conta.`,
        ephemeral: true
      });
    }

    const texto = bots.map(bot =>
      `${e.gerenciar} **${bot.id}**\n` +
      `${e.ativo} Status: **${bot.status}**\n` +
      `${e.id} Bot ID: \`${bot.bot}\`\n` +
      `🏠 Servidor: \`${bot.servidor}\`\n` +
      `${e.horario} Expira: **${bot.expira}**`
    ).join("\n\n");

    const embed = new EmbedBuilder()
      .setTitle(`${e.gerenciar} Seus Bots`)
      .setDescription(texto)
      .setFooter({
        text: "Zyphor Management"
      });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }

  /* MEU PERFIL */

  if (interaction.customId === "meu_perfil") {

    const db = carregarDB();

    const bots = Object.values(db.bots)
      .filter(bot =>
        bot.cliente === interaction.user.id
      );

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${e.perfil} Meu Perfil`)
          .setDescription(
            `${e.perfil} Usuário: <@${interaction.user.id}>\n` +
            `${e.id} ID: \`${interaction.user.id}\`\n\n` +
            `${e.gerenciar} Bots vinculados: **${bots.length}**`
          )
      ],
      ephemeral: true
    });
  }

  /* ADMIN */

  if (
    interaction.customId.startsWith("admin_") &&
    !isOwner(interaction.user.id)
  ) {
    return interaction.reply({
      content: `${e.proibido} Sem permissão.`,
      ephemeral: true
    });
  }

  if (interaction.customId === "admin_bots") {

    return interaction.reply({
      content:
        `${e.gerenciar} **Gerenciamento de Bots**\n\n` +
        `O sistema de cadastro/edição será conectado aqui.`,
      ephemeral: true
    });
  }

  if (interaction.customId === "admin_clientes") {

    const db = carregarDB();

    const clientes = new Set(
      Object.values(db.bots)
        .map(bot => bot.cliente)
    );

    return interaction.reply({
      content:
        `${e.perfil} Clientes cadastrados: **${clientes.size}**`,
      ephemeral: true
    });
  }

  if (interaction.customId === "admin_expiracoes") {

    const db = carregarDB();

    const bots = Object.values(db.bots);

    const ativos =
      bots.filter(b => b.status === "ativo").length;

    const expirados =
      bots.filter(b => b.status === "expirado").length;

    return interaction.reply({
      content:
        `${e.horario} **Expirações**\n\n` +
        `${e.ativo} Ativos: **${ativos}**\n` +
        `${e.desativado} Expirados: **${expirados}**`,
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
