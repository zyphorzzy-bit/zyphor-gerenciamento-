const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const config = require("./config.json");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const e = {
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
  proibido: "<:Proibido:1534611991929290877>",
  fechar: "<:fechar:1541318085435199569>",
  atender: "<:atender:1541318084210720799>",
  fixo: "<:fixo:1541318082574684240>",
  ativo: "<a:ativado:1534611985260609607>",
  desativado: "<a:desativado:1534611986539876463>",
  loading: "<a:loanding:1534612861211377868>",
  seta2: "<:seta:1539785898693234700>",
  pingBom: "<a:pingbom:1539786201551077386>",
  pingRuim: "<a:pingruim:1539786202822217731>"
};

const clientApp = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const comandos = [
  new SlashCommandBuilder()
    .setName("gerenciador")
    .setDescription("Abre o painel do gerenciador.")
];

client.once("ready", async () => {
  console.log(`${e.ativo} ${client.user.tag} online!`);

  const rest = new REST({ version: "10" })
    .setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: comandos.map(c => c.toJSON())
      }
    );

    console.log(`${e.ativo} /gerenciador registrado.`);
  } catch (err) {
    console.error(`${e.proibido} Erro:`, err);
  }
});

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName !== "gerenciador") return;

    if (!config.owners.includes(interaction.user.id)) {
      return interaction.reply({
        content: `${e.proibido} Você não possui permissão para utilizar o gerenciador.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${e.zyphor} Gerenciador`)
      .setDescription(
        `${e.user} Olá, **${interaction.user.username}**!\n\n` +
        `${e.gerenciar} Utilize os botões abaixo para gerenciar o sistema.\n\n` +
        `${e.ativo} **Sistema:** Online\n` +
        `${e.id} **Administrador:** <@${interaction.user.id}>`
      )
      .setFooter({
        text: "Zyphor • Gerenciador"
      });

    const linha1 = new ActionRowBuilder().addComponents(
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

    const linha2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("config")
        .setLabel("Configuração")
        .setEmoji("1534611990633250937")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("stats")
        .setLabel("Estatísticas")
        .setEmoji("1539785898693234700")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.reply({
      embeds: [embed],
      components: [linha1, linha2],
      ephemeral: true
    });
  }

  if (interaction.isButton()) {

    if (!config.owners.includes(interaction.user.id)) {
      return interaction.reply({
        content: `${e.proibido} Você não possui permissão.`,
        ephemeral: true
      });
    }

    switch (interaction.customId) {

      case "gerenciar":
        return interaction.reply({
          content:
            `${e.gerenciar} **Gerenciar Bots**\n\n` +
            `${e.ativo} Sistema de gerenciamento em preparação.\n\n` +
            `${e.seta} Próximo: cadastro dos bots, cliente, servidor e expiração.`,
          ephemeral: true
        });

      case "clientes":
        return interaction.reply({
          content:
            `${e.perfil} **Clientes**\n\n` +
            `Nenhum cliente cadastrado ainda.`,
          ephemeral: true
        });

      case "expiracoes":
        return interaction.reply({
          content:
            `${e.horario} **Expirações**\n\n` +
            `${e.ativo} Sistema de expiração será conectado ao banco de dados.`,
          ephemeral: true
        });

      case "config":
        return interaction.reply({
          content:
            `${e.config} **Configuração**\n\n` +
            `${e.seta} Configurações do gerenciador serão adicionadas aqui.`,
          ephemeral: true
        });

      case "stats":
        return interaction.reply({
          content:
            `📊 **Estatísticas**\n\n` +
            `${e.gerenciar} Bots: **0**\n` +
            `${e.user} Clientes: **0**\n` +
            `${e.ativo} Ativos: **0**\n` +
            `${e.desativado} Expirados: **0**`,
          ephemeral: true
        });
    }
  }
});

client.login(process.env.TOKEN);
