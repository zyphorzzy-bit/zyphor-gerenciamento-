const {
  Client,
  GatewayIntentBits,
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

const commands = [
  new SlashCommandBuilder()
    .setName("gerenciador")
    .setDescription("Abre o painel do gerenciador.")
];

client.once("ready", async () => {
  console.log(`${e.ativo} ${client.user.tag} online!`);

  try {
    await client.application.commands.set(
      commands.map(command => command.toJSON())
    );

    console.log(`${e.ativo} /gerenciador registrado com sucesso!`);
  } catch (error) {
    console.error(`${e.proibido} Erro ao registrar comando:`, error);
  }
});

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName !== "gerenciador") return;

    if (!config.owners.includes(interaction.user.id)) {
      return interaction.reply({
        content:
          `${e.proibido} Você não possui permissão para utilizar o gerenciador.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${e.zyphor} Zyphor Management`)
      .setDescription(
        `${e.user} Olá, **${interaction.user.username}**!\n\n` +
        `${e.gerenciar} Bem-vindo ao painel de gerenciamento.\n` +
        `${e.seta} Selecione uma opção abaixo.\n\n` +
        `${e.ativo} **Sistema:** Online\n` +
        `${e.id} **Administrador:** <@${interaction.user.id}>`
      )
      .setFooter({
        text: "Zyphor Management"
      });

    const row1 = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("gerenciar")
        .setLabel("Gerenciar")
        .setEmoji("1540870215640809482")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("perfil")
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
        .setEmoji("1539785898693234700")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("suporte")
        .setLabel("Suporte")
        .setEmoji("1539845832004870154")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row1, row2],
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
            `${e.seta} Aqui ficará o sistema para adicionar, editar, remover e transferir bots.`,
          ephemeral: true
        });

      case "perfil":
        return interaction.reply({
          content:
            `${e.perfil} **Clientes**\n\n` +
            `${e.user} Nenhum cliente cadastrado ainda.`,
          ephemeral: true
        });

      case "expiracoes":
        return interaction.reply({
          content:
            `${e.horario} **Expirações**\n\n` +
            `${e.ativo} O sistema automático
