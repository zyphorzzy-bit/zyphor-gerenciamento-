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
  StringSelectMenuBuilder,
  ActivityType
} = require("discord.js");

const fs = require("fs");

const config = require("./config.json");

const DB_FILE = "./database.json";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   EMOJIS
========================= */

const e = {
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
  suporte: "<:suporte:1539845832004870154>",
  avisos: "<:avisos:1539125781320433724>",
  link: "<:linkexterno:1539124690709385330>",
  seta: "<:setinha:1539125798462685316>",
  not: "<:not:1539815573981237388>",
  zyphor: "<:zyphor:1540096483276095621>",
  fechar: "<:fechar:1541318085435199569>",
  atender: "<:atender:1541318084210720799>",
  fixo: "<:fixo:1541318082574684240>"
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

function gerarID(db) {
  const ids = Object.keys(db.bots);

  let numero = ids.length + 1;

  while (db.bots[`Z-${String(numero).padStart(2, "0")}`]) {
    numero++;
  }

  return `Z-${String(numero).padStart(2, "0")}`;
}

/* =========================
   PERMISSÃO
========================= */

function isOwner(id) {
  return config.owners.includes(id);
}

/* =========================
   COMANDO
========================= */

const comandos = [
  new SlashCommandBuilder()
    .setName("gerenciador")
    .setDescription("Abre o painel administrativo.")
];

/* =========================
   BOT ONLINE
========================= */

client.once("ready", async () => {
  console.log(`${e.ativo} ${client.user.tag} online!`);

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
      comandos.map(c => c.toJSON())
    );

    console.log(`${e.ativo} /gerenciador registrado!`);
  } catch (err) {
    console.error(`${e.proibido} Erro:`, err);
  }
});

/* =========================
   PAINEL PRINCIPAL
========================= */

function painelPrincipal() {
  const embed = new EmbedBuilder()
    .setTitle(`${e.zyphor} Zyphor Management`)
    .setDescription(
      `${e.gerenciar} **Painel Administrativo**\n\n` +
      `Gerencie os bots, clientes e licenças através deste painel.\n\n` +
      `${e.ativo} Sistema online`
    )
    .setFooter({
      text: "Zyphor Management"
    });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gerenciar")
      .setLabel("Gerenciar Bots")
      .setEmoji("1540870215640809482")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("clientes")
      .setLabel("Clientes")
      .setEmoji("1540557352602705990")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("expiracoes")
      .setLabel("Expirações")
      .setEmoji("1534611997335883886")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("config")
      .setLabel("Configuração")
      .setEmoji("1534611990633250937")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("stats")
      .setLabel("Estatísticas")
      .setEmoji("1539786201551077386")
      .setStyle(ButtonStyle.Success)
  );

  return {
    embeds: [embed],
    components: [row1, row2],
    ephemeral: true
  };
}

/* =========================
   INTERAÇÕES
========================= */

client.on("interactionCreate", async interaction => {

  /* ---------- COMANDO ---------- */

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName !== "gerenciador")
      return;

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content:
          `${e.proibido} Você não possui permissão para acessar o painel.`,
        ephemeral: true
      });
    }

    return interaction.reply(painelPrincipal());
  }

  /* ---------- BOTÕES ---------- */

  if (interaction.isButton()) {

    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        content: `${e.proibido} Sem permissão.`,
        ephemeral: true
      });
    }

    /* GERENCIAR */

    if (interaction.customId === "gerenciar") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("adicionar_bot")
          .setLabel("Adicionar Bot")
          .setEmoji("1539124707222093915")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("listar_bots")
          .setLabel("Ver Bots")
          .setEmoji("1539124693460713552")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("voltar")
          .setLabel("Voltar")
          .setEmoji("1539125798462685316")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${e.gerenciar} Gerenciar Bots`)
            .setDescription(
              "Escolha uma opção para administrar os bots cadastrados."
            )
        ],
        components: [row],
        ephemeral: true
      });
    }

    /* ADICIONAR BOT */

    if (interaction.customId === "adicionar_bot") {

      const modal = new ModalBuilder()
        .setCustomId("modal_adicionar")
        .setTitle("Adicionar Bot");

      const cliente = new TextInputBuilder()
        .setCustomId("cliente")
        .setLabel("ID do cliente")
        .setPlaceholder("Ex: 123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const bot = new TextInputBuilder()
        .setCustomId("bot")
        .setLabel("ID do bot")
        .setPlaceholder("Ex: 987654321098765432")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const servidor = new TextInputBuilder()
        .setCustomId("servidor")
        .setLabel("ID do servidor")
        .setPlaceholder("Ex: 111222333444555666")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const dias = new TextInputBuilder()
        .setCustomId("dias")
        .setLabel("Dias de validade")
        .setPlaceholder("Ex: 30")
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

    /* LISTAR */

    if (interaction.customId === "listar_bots") {

      const db = carregarDB();
      const bots = Object.values(db.bots);

      if (!bots.length) {
        return interaction.reply({
          content: `${e.not} Nenhum bot cadastrado.`,
          ephemeral: true
        });
      }

      const texto = bots
        .slice(0, 15)
        .map(bot =>
          `${e.gerenciar} **${bot.id}**\n` +
          `${e.user} Cliente: <@${bot.cliente}>\n` +
          `${e.id} Bot: \`${bot.bot}\`\n` +
          `🏠 Servidor: \`${bot.servidor}\`\n` +
          `${e.horario} Expira: **${bot.expira}**\n` +
          `${bot.status === "ativo" ? e.ativo : e.desativado} Status: **${bot.status}**`
        )
        .join("\n\n");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${e.gerenciar} Bots cadastrados`)
            .setDescription(texto)
        ],
        ephemeral: true
      });
    }

    /* CLIENTES */

    if (interaction.customId === "clientes") {

      const db = carregarDB();
      const clientes = new Set(
        Object.values(db.bots).map(b => b.cliente)
      );

      return interaction.reply({
        content:
          `${e.perfil} **Clientes cadastrados:** ${clientes.size}`,
        ephemeral: true
      });
    }

    /* EXPIRAÇÕES */

    if (interaction.customId === "expiracoes") {

      const db = carregarDB();
      const bots = Object.values(db.bots);

      const ativos = bots.filter(b => b.status === "ativo").length;
      const expirados = bots.filter(b => b.status === "expirado").length;

      return interaction.reply({
        content:
          `${e.horario} **Expirações**\n\n` +
          `${e.ativo} Ativos: **${ativos}**\n` +
          `${e.desativado} Expirados: **${expirados}**`,
        ephemeral: true
      });
    }

    /* ESTATÍSTICAS */

    if (interaction.customId === "stats") {

      const db = carregarDB();
      const bots = Object.values(db.bots);

      return interaction.reply({
        content:
          `📊 **Estatísticas**\n\n` +
          `${e.gerenciar} Bots: **${bots.length}**\n` +
          `${e.ativo} Ativos: **${bots.filter(b => b.status === "ativo").length}**\n` +
          `${e.desativado} Expirados: **${bots.filter(b => b.status === "expirado").length}**`,
        ephemeral: true
      });
    }

    /* CONFIG */

    if (interaction.customId === "config") {

      return interaction.reply({
        content:
          `${e.config} **Configuração**\n\n` +
          `⚙️ Configurações avançadas serão adicionadas aqui.`,
        ephemeral: true
      });
    }

    /* VOLTAR */

    if (interaction.customId === "voltar") {

      return interaction.update(painelPrincipal());
    }
  }

  /* ---------- MODAL ---------- */

  if (interaction.isModalSubmit()) {

    if (!isOwner(interaction.user.id))
      return;

    if (interaction.customId === "modal_adicionar") {

      const cliente =
        interaction.fields.getTextInputValue("cliente");

      const bot =
        interaction.fields.getTextInputValue("bot");

      const servidor =
        interaction.fields.getTextInputValue("servidor");

      const dias =
        parseInt(
          interaction.fields.getTextInputValue("dias")
        );

      if (!Number.isInteger(dias) || dias <= 0) {
        return interaction.reply({
          content: `${e.proibido} Informe uma quantidade válida de dias.`,
          ephemeral: true
        });
      }

      const db = carregarDB();

      const id = gerarID(db);

      const data = new Date();

      data.setDate(data.getDate() + dias);

      const expira =
        data.toLocaleDateString("pt-BR");

      db.bots[id] = {
        id,
        cliente,
        bot,
        servidor,
        criado: new Date().toLocaleDateString("pt-BR"),
        expira,
        dias,
        status: "ativo",
        historico: [
          {
            acao: "Bot cadastrado",
            por: interaction.user.id,
            data: new Date().toISOString()
          }
        ]
      };

      salvarDB(db);

      return interaction.reply({
        content:
          `${e.ativo} **Bot cadastrado com sucesso!**\n\n` +
          `${e.gerenciar} ID: **${id}**\n` +
          `${e.user} Cliente: <@${cliente}>\n` +
          `${e.id} Bot ID: \`${bot}\`\n` +
          `🏠 Servidor: \`${servidor}\`\n` +
          `${e.horario} Expira: **${expira}**`,
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
