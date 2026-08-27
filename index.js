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

/* =====================================================
   CONFIGURAÇÕES
===================================================== */

const TOKEN = process.env.TOKEN;

const OWNERS = [
  "1521362851502227588",
  "1533306874513068093"
];

const SUPPORT =
  "https://discord.gg/uAaSXMkUg4";

const DB_FILE = "./database.json";

/* =====================================================
   CLIENT
===================================================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

/* =====================================================
   EMOJIS
===================================================== */

const E = {
  ativo: "<a:ativado:1534611985260609607>",
  desativado: "<a:desativado:1534611986539876463>",
  proibido: "<:Proibido:1534611991929290877>",
  protecao: "<:proteo:1534611994353602732>",
  warn: "<:warn:1539125781320433724>",
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
  linkexterno: "<:linkexterno:1539124690709385330>",
  seta: "<:setinha:1539125798462685316>",
  not: "<:not:1539815573981237388>",
  zyphor: "<:zyphor:1540096483276095621>",
  fechar: "<:fechar:1541318085435199569>",
  atender: "<:atender:1541318084210720799>",
  fixo: "<:fixo:1541318082574684240>"
};

/* =====================================================
   FUNÇÕES
===================================================== */

function isOwner(id) {
  return OWNERS.includes(id);
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      bots: {},
      settings: {}
    };

    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(initial, null, 2)
    );

    return initial;
  }

  try {
    return JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );
  } catch {
    return {
      bots: {},
      settings: {}
    };
  }
}

function saveDB(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2)
  );
}

function getNextBotID(db) {
  let number = 1;

  while (
    db.bots[
      `Z-${String(number).padStart(2, "0")}`
    ]
  ) {
    number++;
  }

  return `Z-${String(number).padStart(2, "0")}`;
}

function getUserBots(userId) {
  const db = loadDB();

  return Object.values(db.bots).filter(
    bot => bot.cliente === userId
  );
}

/* =====================================================
   EXPIRAÇÃO
===================================================== */

function calculateExpiration(days) {
  const date = new Date();

  date.setDate(
    date.getDate() + Number(days)
  );

  return date.toLocaleDateString("pt-BR");
}

function isExpired(dateString) {
  if (!dateString) return false;

  const parts = dateString.split("/");

  if (parts.length !== 3) {
    return false;
  }

  const date = new Date(
    Number(parts[2]),
    Number(parts[1]) - 1,
    Number(parts[0]),
    23,
    59,
    59
  );

  return Date.now() > date.getTime();
}

/* =====================================================
   EMBED PÚBLICO
===================================================== */

function publicEmbed() {
  return new EmbedBuilder()
    .setTitle(`${E.zyphor} Zyphor Management`)
    .setDescription(
      `## ${E.gerenciar} Painel do Cliente\n\n` +
      `Gerencie e consulte os bots vinculados à sua conta.\n\n` +

      `${E.gerenciar} **Meus Bots**\n` +
      `Veja seus bots, servidores, IDs e datas de expiração.\n\n` +

      `${E.perfil} **Meu Perfil**\n` +
      `Veja suas informações e quantidade de bots vinculados.\n\n` +

      `${E.avisos} **Privacidade**\n` +
      `Você pode solicitar a remoção dos seus dados pelo painel.\n\n` +

      `${E.suporte} **Suporte**\n` +
      `Caso seu bot expire, entre no nosso suporte para solicitar a renovação.`
    )
    .setFooter({
      text: "Zyphor Management • Painel Público"
    });
}

function publicButtons() {
  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId("public_bots")
      .setLabel("Meus Bots")
      .setEmoji(E.gerenciar)
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("public_profile")
      .setLabel("Meu Perfil")
      .setEmoji(E.perfil)
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("public_delete")
      .setLabel("Remover Dados")
      .setEmoji(E.arquivo)
      .setStyle(ButtonStyle.Danger)
  );
}

/* =====================================================
   EMBED ADMIN
===================================================== */

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

      `${E.gerenciar} **Bots cadastrados:** ${bots.length}\n` +
      `${E.ativo} **Bots ativos:** ${ativos}\n` +
      `${E.desativado} **Bots expirados:** ${expirados}\n` +
      `${E.user} **Clientes:** ${clientes}\n\n` +

      `Use os botões abaixo para administrar o sistema.`
    )
    .setFooter({
      text: "Zyphor Management • Área Administrativa"
    });
}

function adminButtons() {
  return [

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("adm_add")
        .setLabel("Adicionar Bot")
        .setEmoji(E.gerenciar)
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("adm_bots")
        .setLabel("Bots")
        .setEmoji(E.id)
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("adm_expirations")
        .setLabel("Expirações")
        .setEmoji(E.horario)
        .setStyle(ButtonStyle.Secondary)
    ),

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("adm_clients")
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

/* =====================================================
   TÓPICOS
===================================================== */

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
      text: "Zyphor Management • Gerenciamento"
    });
}

async function createBotThread(channel, bot) {
  if (!channel) return null;

  try {
    const thread =
      await channel.threads.create({
        name: `${bot.id} • Gerenciamento`,
        autoArchiveDuration: 10080,
        reason: `Gerenciamento ${bot.id}`
      });

    await thread.send({
      embeds: [
        botEmbed(bot)
      ]
    });

    return thread;

  } catch (error) {

    console.error(
      `${E.proibido} Erro ao criar tópico:`,
      error
    );

    return null;
  }
}

/* =====================================================
   COMANDOS
===================================================== */

const commands = [

  new SlashCommandBuilder()
    .setName("z-painel")
    .setDescription(
      "Publica o painel público do Zyphor Management."
    )
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription(
          "Canal onde o painel será enviado."
        )
        .addChannelTypes(
          ChannelType.GuildText
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("z-painel-adm")
    .setDescription(
      "Publica o painel administrativo."
    )
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription(
          "Canal onde o painel ADM será enviado."
        )
        .addChannelTypes(
          ChannelType.GuildText
        )
        .setRequired(true)
    )
];

/* =====================================================
   BOT ONLINE
===================================================== */

client.once("clientReady", async () => {

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
      commands.map(
        command => command.toJSON()
      )
    );

    console.log(
      `${E.ativo} Comandos registrados!`
    );

  } catch (error) {

    console.error(
      `${E.proibido} Erro ao registrar comandos:`,
      error
    );
  }
});

/* =====================================================
   SLASH COMMANDS
===================================================== */

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    /* ---------------------------------------------
       PAINEL PÚBLICO
    --------------------------------------------- */

    if (
      interaction.commandName === "z-painel"
    ) {

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

        const message =
          await channel.send({
            embeds: [
              publicEmbed()
            ],
            components: [
              publicButtons()
            ]
          });

        try {
          await message.pin();
        } catch {}

        return interaction.reply({
          content:
            `${E.ativo} Painel público enviado e fixado em ${channel}.`,
          ephemeral: true
        });

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            `${E.proibido} Não consegui enviar o painel.`,
          ephemeral: true
        });
      }
    }

    /* ---------------------------------------------
       PAINEL ADMINISTRATIVO
    --------------------------------------------- */

    if (
      interaction.commandName === "z-painel-adm"
    ) {

      if (!isOwner(interaction.user.id)) {

        return interaction.reply({
          content:
            `${E.proibido} Apenas os owners podem usar o painel ADM.`,
          ephemeral: true
        });
      }

      const channel =
        interaction.options.getChannel("canal");

      try {

        const message =
          await channel.send({
            embeds: [
              adminEmbed()
            ],
            components: adminButtons()
          });

        try {
          await message.pin();
        } catch {}

        return interaction.reply({
          content:
            `${E.ativo} Painel ADM enviado e fixado em ${channel}.`,
          ephemeral: true
        });

      } catch (error) {

        console.error(error);

        return interaction.reply({
          content:
            `${E.proibido} Não consegui enviar o painel ADM.`,
          ephemeral: true
        });
      }
    }
  }
);

/* =====================================================
   BOTÕES
===================================================== */

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isButton()) {
      return;
    }

    /* ---------------------------------------------
       MEUS BOTS
    --------------------------------------------- */

    if (
      interaction.customId === "public_bots"
    ) {

      const bots =
        getUserBots(
          interaction.user.id
        );

      if (!bots.length) {

        return interaction.reply({
          content:
            `${E.proibido} Você não possui bots vinculados.`,
          ephemeral: true
        });
      }

      const text =
        bots
          .map(bot => {

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

          })
          .join("\n\n");

      return interaction.reply({

        embeds: [
          new EmbedBuilder()
            .setTitle(
              `${E.gerenciar} Meus Bots`
            )
            .setDescription(text)
        ],

        ephemeral: true
      });
    }

    /* ---------------------------------------------
       PERFIL
    --------------------------------------------- */

    if (
      interaction.customId === "public_profile"
    ) {

      const bots =
        getUserBots(
          interaction.user.id
        );

      return interaction.reply({

        embeds: [

          new EmbedBuilder()
            .setTitle(
              `${E.perfil} Meu Perfil`
            )
            .setDescription(
              `${E.user} **Usuário:** <@${interaction.user.id}>\n` +
              `${E.id} **ID:** \`${interaction.user.id}\`\n\n` +
              `${E.gerenciar} **Bots vinculados:** ${bots.length}`
            )
        ],

        ephemeral: true
      });
    }

    /* ---------------------------------------------
       REMOVER DADOS
    --------------------------------------------- */

    if (
      interaction.customId === "public_delete"
    ) {

      const db = loadDB();

      let removed = 0;

      for (
        const [id, bot]
        of Object.entries(db.bots)
      ) {

        if (
          bot.cliente === interaction.user.id
        ) {

          delete db.bots[id];

          removed++;
        }
      }

      saveDB(db);

      return interaction.reply({
        content:
          `${E.ativo} Seus dados foram removidos.\n\n` +
          `${E.arquivo} Registros removidos: **${removed}**`,
        ephemeral: true
      });
    }

    /* ---------------------------------------------
       SEGURANÇA ADM
    --------------------------------------------- */

    if (
      interaction.customId.startsWith("adm_")
    ) {

      if (
        !isOwner(
          interaction.user.id
        )
      ) {

        return interaction.reply({
          content:
            `${E.proibido} Você não possui permissão para isso.`,
          ephemeral: true
        });
      }
    }

    /* ---------------------------------------------
       ADICIONAR BOT
    --------------------------------------------- */

    if (
      interaction.customId === "adm_add"
    ) {

      const modal =
        new ModalBuilder()
          .setCustomId(
            "modal_add_bot"
          )
          .setTitle(
            "Adicionar Bot"
          );

      const cliente =
        new TextInputBuilder()
          .setCustomId("cliente")
          .setLabel("ID do cliente")
          .setPlaceholder(
            "123456789012345678"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      const bot =
        new TextInputBuilder()
          .setCustomId("bot")
          .setLabel("ID do bot")
          .setPlaceholder(
            "ID do bot"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      const servidor =
        new TextInputBuilder()
          .setCustomId("servidor")
          .setLabel("ID do servidor")
          .setPlaceholder(
            "ID do servidor"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      const dias =
        new TextInputBuilder()
          .setCustomId("dias")
          .setLabel("Dias de validade")
          .setPlaceholder("30")
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      modal.addComponents(

        new ActionRowBuilder()
          .addComponents(cliente),

        new ActionRowBuilder()
          .addComponents(bot),

        new ActionRowBuilder()
          .addComponents(servidor),

        new ActionRowBuilder()
          .addComponents(dias)
      );

      return interaction.showModal(
        modal
      );
    }

    /* ---------------------------------------------
       LISTA DE BOTS
    --------------------------------------------- */

    if (
      interaction.customId === "adm_bots"
    ) {

      const db = loadDB();

      const bots =
        Object.values(db.bots);

      if (!bots.length) {

        return interaction.reply({
          content:
            `${E.proibido} Nenhum bot cadastrado.`,
          ephemeral: true
        });
      }

      const text =
        bots
          .slice(0, 20)
          .map(bot => {

            return (
              `${E.gerenciar} **${bot.id}**\n` +
              `${E.user} <@${bot.cliente}>\n` +
              `${E.id} \`${bot.bot}\`\n` +
              `${E.horario} ${bot.expira}\n` +
              `${bot.status === "ativo" ? E.ativo : E.desativado} ${bot.status}`
            );

          })
          .join("\n\n");

      return interaction.reply({

        embeds: [

          new EmbedBuilder()
            .setTitle(
              `${E.gerenciar} Bots cadastrados`
            )
            .setDescription(text)
        ],

        ephemeral: true
      });
    }

    /* ---------------------------------------------
       EXPIRAÇÕES
    --------------------------------------------- */

    if (
      interaction.customId === "adm_expirations"
    ) {

      const db = loadDB();

      const bots =
        Object.values(db.bots);

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
            .setTitle(
              `${E.horario} Expirações`
            )
            .setDescription(
              `${E.ativo} **Ativos:** ${ativos}\n` +
              `${E.desativado} **Expirados:** ${expirados}`
            )
        ],

        ephemeral: true
      });
    }

    /* ---------------------------------------------
       CLIENTES
    --------------------------------------------- */

    if (
      interaction.customId === "adm_clients"
    ) {

      const db = loadDB();

      const clients =
        new Set(
          Object.values(db.bots)
            .map(
              bot => bot.cliente
            )
        );

      return interaction.reply({
        content:
          `${E.perfil} Clientes cadastrados: **${clients.size}**`,
        ephemeral: true
      });
    }

    /* ---------------------------------------------
       ESTATÍSTICAS
    --------------------------------------------- */

    if (
      interaction.customId === "adm_stats"
    ) {

      const db = loadDB();

      const bots =
        Object.values(db.bots);

      return interaction.reply({

        embeds: [

          new EmbedBuilder()
            .setTitle(
              "📊 Estatísticas"
            )
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
  }
);

/* =====================================================
   MODAL - ADICIONAR BOT
===================================================== */

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isModalSubmit()
    ) {
      return;
    }

    if (
      interaction.customId !==
      "modal_add_bot"
    ) {
      return;
    }

    if (
      !isOwner(
        interaction.user.id
      )
    ) {

      return interaction.reply({
        content:
          `${E.proibido} Sem permissão.`,
        ephemeral: true
      });
    }

    const cliente =
      interaction.fields
        .getTextInputValue(
          "cliente"
        )
        .trim();

    const botID =
      interaction.fields
        .getTextInputValue(
          "bot"
        )
        .trim();

    const servidor =
      interaction.fields
        .getTextInputValue(
          "servidor"
        )
        .trim();

    const dias =
      Number(
        interaction.fields
          .getTextInputValue(
            "dias"
          )
          .trim()
      );

    /* ---------------------------------------------
       VALIDAÇÕES
    --------------------------------------------- */

    if (
      !/^\d{17,20}$/.test(
        cliente
      )
    ) {

      return interaction.reply({
        content:
          `${E.proibido} ID do cliente inválido.`,
        ephemeral: true
      });
    }

    if (
      !/^\d{17,20}$/.test(
        botID
      )
    ) {

      return interaction.reply({
        content:
          `${E.proibido} ID do bot inválido.`,
        ephemeral: true
      });
    }

    if (
      !/^\d{17,20}$/.test(
        servidor
      )
    ) {

      return interaction.reply({
        content:
          `${E.proibido} ID do servidor inválido.`,
        ephemeral: true
      });
    }

    if (
      !Number.isInteger(dias) ||
      dias <= 0
    ) {

      return interaction.reply({
        content:
          `${E.proibido} Quantidade de dias inválida.`,
        ephemeral: true
      });
    }

    /* ---------------------------------------------
       CADASTRO
    --------------------------------------------- */

    const db = loadDB();

    const id =
      getNextBotID(db);

    const expira =
      calculateExpiration(
        dias
      );

    const bot = {

      id,

      cliente,

      bot: botID,

      servidor,

      dias,

      expira,

      status: "ativo",

      criado:
        new Date().toISOString(),

      thread: null
    };

    db.bots[id] = bot;

    saveDB(db);

    /* ---------------------------------------------
       TÓPICO
    --------------------------------------------- */

    const thread =
      await createBotThread(
        interaction.channel,
        bot
      );

    if (thread) {

      db.bots[id].thread =
        thread.id;

      saveDB(db);
    }

    /* ---------------------------------------------
       DM CLIENTE
    --------------------------------------------- */

    try {

      const user =
        await client.users.fetch(
          cliente
        );

      await user.send(

        `${E.ativo} **Bot cadastrado com sucesso!**\n\n` +

        `${E.gerenciar} **Código:** ${id}\n` +
        `${E.id} **ID do Bot:** \`${botID}\`\n` +
        `🏠 **Servidor:** \`${servidor}\`\n` +
        `${E.horario} **Expiração:** ${expira}\n\n` +

        `${E.suporte} Suporte:\n` +
        `${SUPPORT}`
      );

    } catch {}
    
    /* ---------------------------------------------
       RESPOSTA
    --------------------------------------------- */

    return interaction.reply({

      content:

        `${E.ativo} **Bot cadastrado com sucesso!**\n\n` +

        `${E.gerenciar} **Código:** ${id}\n` +
        `${E.user} **Cliente:** <@${cliente}>\n` +
        `${E.id} **Bot:** \`${botID}\`\n` +
        `🏠 **Servidor:** \`${servidor}\`\n` +
        `${E.horario} **Expiração:** ${expira}`,

      ephemeral: true
    });
  }
);

/* =====================================================
   SISTEMA DE EXPIRAÇÃO
===================================================== */

async function checkExpirations() {

  const db = loadDB();

  let changed = false;

  for (
    const bot
    of Object.values(db.bots)
  ) {

    if (
      bot.status === "expirado"
    ) {
      continue;
    }

    if (
      !isExpired(
        bot.expira
      )
    ) {
      continue;
    }

    bot.status =
      "expirado";

    changed = true;

    /* ---------------------------------------------
       AVISO AO CLIENTE
    --------------------------------------------- */

    try {

      const user =
        await client.users.fetch(
          bot.cliente
        );

      await user.send(

        `${E.desativado} **Seu bot ${bot.id} expirou.**\n\n` +

        `${E.horario} Data de expiração: **${bot.expira}**\n\n` +

        `Caso queira renovar, abra atendimento em:\n` +
        `${SUPPORT}\n\n` +

        `${E.id} Informe o código **${bot.id}** no atendimento.`
      );

    } catch {}

    /* ---------------------------------------------
       TÓPICO
    --------------------------------------------- */

    if (bot.thread) {

      try {

        const thread =
          await client.channels.fetch(
            bot.thread
          );

        if (thread) {

          await thread.send(
            `${E.desativado} **${bot.id} expirou.**\n` +
            `${E.horario} Expiração: **${bot.expira}**`
          );
        }

      } catch {}
    }
  }

  if (changed) {
    saveDB(db);
  }
}

/* =====================================================
   VERIFICA EXPIRAÇÕES A CADA MINUTO
===================================================== */

setInterval(
  checkExpirations,
  60 * 1000
);

/* =====================================================
   SERVIDOR WEB
   NECESSÁRIO PARA HOSTS COMO RAILWAY
===================================================== */

const app =
  express();

app.get(
  "/",
  (req, res) => {

    res.send(
      "Zyphor Management online."
    );
  }
);

app.get(
  "/health",
  (req, res) => {

    res.json({

      online: true,

      bot:
        client.user
          ? client.user.tag
          : null,

      uptime:
        process.uptime()
    });
  }
);

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  () => {

    console.log(
      `${E.ativo} Web server online na porta ${PORT}!`
    );
  }
);

/* =====================================================
   TOKEN
===================================================== */

if (!TOKEN) {

  console.error(
    `${E.proibido} TOKEN não configurado!`
  );

  console.error(
    `Configure a variável TOKEN na hospedagem.`
  );

  process.exit(1);
}

/* =====================================================
   LOGIN
===================================================== */

client.login(
  TOKEN
).catch(error => {

  console.error(
    `${E.proibido} Erro ao conectar o bot:`
  );

  console.error(error);
});
