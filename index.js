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

const OWNERS = [
  "1521362851502227588",
  "1533306874513068093"
];

const TOKEN = process.env.TOKEN;

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
  config: "<:config:1534611990633250937>",
  gerenciar: "<:gerenciar:1540870215640809482>",
  perfil: "<:perfil:1540557352602705990>",
  id: "<:ID:1534611999085039786>",
  horario: "<:horrio:1534611997335883886>",
  user: "<:user:1539125800907968603>",
  posse: "<:passarposse:1539125801851813970>",
  avisos: "<:avisos:1539125781320433724>",
  zyphor: "<:zyphor:1540096483276095621>",
  seta: "<:setinha:1539125798462685316>",
  fechar: "<:fechar:1541318085435199569>",
  atender: "<:atender:1541318084210720799>",
  fixo: "<:fixo:1541318082574684240>"
};

/* =====================================================
   FUNÇÕES BÁSICAS
===================================================== */

function isOwner(id) {
  return OWNERS.includes(id);
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({
        bots: {},
        settings: {}
      }, null, 2)
    );
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
   DATA
===================================================== */

function calculateExpiration(days) {
  const date = new Date();

  date.setDate(
    date.getDate() + Number(days)
  );

  return date.toLocaleDateString(
    "pt-BR"
  );
}

function isExpired(dateString) {
  if (!dateString) return false;

  const parts =
    dateString.split("/");

  if (parts.length !== 3)
    return false;

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

function createPublicEmbed() {
  return new EmbedBuilder()
    .set
