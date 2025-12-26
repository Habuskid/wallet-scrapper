// Load environment variables (for local development)
if (process.env.NODE_ENV !== 'production') {
  require("dotenv").config();
}

const { Client, GatewayIntentBits } = require("discord.js");
const TelegramBot = require("node-telegram-bot-api");
const { extractWallets } = require("./core/wallets");
const { Session } = require("./core/session");
const { pickWinners } = require("./core/picker");
const { generateSeed } = require("./core/proof");
const { formatMarkdown } = require("./core/export");

// ============================================
// SHARED SESSION MANAGER
// ============================================
class SessionManager {
  constructor() {
    this.sessions = new Map(); // platform_channelId -> session
  }

  createSession(platform, chatId, chain, mode, limit, duration, ownerId) {
    const sessionKey = `${platform}_${chatId}`;
    const session = new Session(sessionKey, chain, mode, parseInt(limit), parseFloat(duration), ownerId);
    this.sessions.set(sessionKey, session);
    return session;
  }

  getSession(platform, chatId) {
    return this.sessions.get(`${platform}_${chatId}`);
  }

  deleteSession(platform, chatId) {
    this.sessions.delete(`${platform}_${chatId}`);
  }

  hasSession(platform, chatId) {
    return this.sessions.has(`${platform}_${chatId}`);
  }
}

const sessionManager = new SessionManager();

// ============================================
// DISCORD BOT SETUP
// ============================================
const discordClient = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// Check if Discord user has permission
function hasDiscordPermission(member) {
  if (member.permissions.has("Administrator")) return true;
  if (member.permissions.has("ManageMessages")) return true;
  if (member.permissions.has("ManageGuild")) return true;
  
  const allowedRoles = ["Moderator", "Admin", "Staff", "Team", "Giveaway Manager"];
  return member.roles.cache.some(role => 
    allowedRoles.some(allowedRole => 
      role.name.toLowerCase().includes(allowedRole.toLowerCase())
    )
  );
}

discordClient.once("clientReady", () => {
  console.log(`Discord Bot Ready! Logged in as ${discordClient.user.tag}`);
});

discordClient.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  
  const args = message.content.split(" ");
  const cmd = args[0];
  
  // !start evm raffle 10 6
  if (cmd === "!start") {
    if (!hasDiscordPermission(message.member)) {
      return message.reply("You don't have permission to start a giveaway. Only moderators and admins can use this command.");
    }
    
    const [, chain, mode, limit, duration] = args;
    
    if (!chain || !mode || !limit || !duration) {
      return message.reply("Usage: `!start <chain> <mode> <winners> <duration_hours>`\nExample: `!start evm raffle 10 6`");
    }

    const session = sessionManager.createSession(
      "discord",
      message.channel.id,
      chain,
      mode,
      limit,
      duration,
      message.author.id
    );
    
    return message.reply(
      `**Giveaway Started**\n` +
      `Chain: **${chain}**\n` +
      `Mode: **${mode}**\n` +
      `Winners: **${limit}**\n` +
      `Duration: **${duration}h**\n\n` +
      `Users can now post their wallet addresses!`
    );
  }
  
  // !finalize
  if (cmd === "!finalize") {
    const session = sessionManager.getSession("discord", message.channel.id);
    if (!session) return message.reply("No active giveaway session in this channel.");
    
    if (session.ownerId !== message.author.id && !hasDiscordPermission(message.member)) {
      return message.reply("Only the session owner or moderators can finalize the giveaway.");
    }
    
    const walletCount = session.getWallets().length;
    if (walletCount === 0) {
      return message.reply("No wallets collected yet! Cannot finalize.");
    }
    
    const seed = generateSeed(session.id, session.endTime, walletCount);
    const winners = pickWinners(session.getWallets(), session.mode, session.limit, seed);
    const output = formatMarkdown(winners);
    
    message.reply(
      `**Winners Selected**\n\n${output}\n\n` +
      `**Total Participants:** ${walletCount}\n` +
      `**Proof Seed:** \`${seed}\``
    );
    
    sessionManager.deleteSession("discord", message.channel.id);
    return;
  }
  
  // !cancel
  if (cmd === "!cancel") {
    const session = sessionManager.getSession("discord", message.channel.id);
    if (!session) return message.reply("No active giveaway session to cancel.");
    
    if (session.ownerId !== message.author.id && !hasDiscordPermission(message.member)) {
      return message.reply("Only the session owner or moderators can cancel the giveaway.");
    }
    
    sessionManager.deleteSession("discord", message.channel.id);
    return message.reply("Giveaway session cancelled.");
  }

  // !status
  if (cmd === "!status") {
    const session = sessionManager.getSession("discord", message.channel.id);
    if (!session) return message.reply("No active giveaway session in this channel.");
    
    const walletCount = session.getWallets().length;
    const timeLeft = Math.max(0, session.endTime - Date.now());
    const hoursLeft = (timeLeft / (1000 * 60 * 60)).toFixed(2);
    
    return message.reply(
      `**Giveaway Status**\n` +
      `Chain: **${session.chain}**\n` +
      `Mode: **${session.mode}**\n` +
      `Winners: **${session.limit}**\n` +
      `Participants: **${walletCount}**\n` +
      `Time Left: **${hoursLeft}h**`
    );
  }
  
  // Collect wallets from any message
  const session = sessionManager.getSession("discord", message.channel.id);
  if (session) {
    try {
      const wallets = extractWallets(message.content, session.chain);
      if (wallets.length > 0) {
        wallets.forEach(w => session.addWallet(w, message.author.id));
        console.log(`Discord: Collected ${wallets.length} wallet(s) from ${message.author.tag}`);
      }
    } catch (error) {
      console.error("Error extracting wallets:", error);
    }
  }
});

// ============================================
// TELEGRAM BOT SETUP
// ============================================
let telegramBot = null;

if (process.env.TELEGRAM_TOKEN) {
  telegramBot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

  // Check if Telegram user has permission (admins and creators)
  async function hasTelegramPermission(chatId, userId) {
    try {
      const member = await telegramBot.getChatMember(chatId, userId);
      return ["creator", "administrator"].includes(member.status);
    } catch (error) {
      console.error("Error checking Telegram permissions:", error);
      return false;
    }
  }

  telegramBot.on("polling_error", (error) => {
    console.error("Telegram polling error:", error.message);
  });

  telegramBot.once("message", () => {
    console.log("Telegram Bot Ready!");
  });

  // /start command
  telegramBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    telegramBot.sendMessage(
      chatId,
      `*Welcome to WalletScrapper*\n\n` +
      `*Commands:*\n` +
      `/giveaway <chain> <mode> <winners> <duration> - Start a giveaway\n` +
      `/finalize - End and pick winners\n` +
      `/cancel - Cancel the giveaway\n` +
      `/status - Check giveaway status\n\n` +
      `*Example:*\n` +
      `/giveaway evm raffle 10 6`,
      { parse_mode: "Markdown" }
    );
  });

  // /giveaway command
  telegramBot.onText(/\/giveaway (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check permissions for groups
    if (msg.chat.type !== "private") {
      const hasPerm = await hasTelegramPermission(chatId, userId);
      if (!hasPerm) {
        return telegramBot.sendMessage(chatId, "Only admins can start giveaways.");
      }
    }

    const args = match[1].split(" ");
    const [chain, mode, limit, duration] = args;

    if (!chain || !mode || !limit || !duration) {
      return telegramBot.sendMessage(
        chatId,
        "Usage: `/giveaway <chain> <mode> <winners> <duration_hours>`\n" +
        "Example: `/giveaway evm raffle 10 6`",
        { parse_mode: "Markdown" }
      );
    }

    const session = sessionManager.createSession(
      "telegram",
      chatId,
      chain,
      mode,
      limit,
      duration,
      userId
    );

    telegramBot.sendMessage(
      chatId,
      `*Giveaway Started*\n\n` +
      `Chain: *${chain}*\n` +
      `Mode: *${mode}*\n` +
      `Winners: *${limit}*\n` +
      `Duration: *${duration}h*\n\n` +
      `Users can now post their wallet addresses!`,
      { parse_mode: "Markdown" }
    );
  });

  // /finalize command
  telegramBot.onText(/\/finalize/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const session = sessionManager.getSession("telegram", chatId);
    if (!session) {
      return telegramBot.sendMessage(chatId, "No active giveaway session.");
    }

    // Check permissions
    const hasPerm = msg.chat.type === "private" || await hasTelegramPermission(chatId, userId);
    if (session.ownerId !== userId && !hasPerm) {
      return telegramBot.sendMessage(chatId, "Only the session owner or admins can finalize.");
    }

    const walletCount = session.getWallets().length;
    if (walletCount === 0) {
      return telegramBot.sendMessage(chatId, "No wallets collected yet!");
    }

    const seed = generateSeed(session.id, session.endTime, walletCount);
    const winners = pickWinners(session.getWallets(), session.mode, session.limit, seed);
    const output = formatMarkdown(winners);

    telegramBot.sendMessage(
      chatId,
      `*Winners Selected*\n\n${output}\n\n` +
      `*Total Participants:* ${walletCount}\n` +
      `*Proof Seed:* \`${seed}\``,
      { parse_mode: "Markdown" }
    );

    sessionManager.deleteSession("telegram", chatId);
  });

  // /cancel command
  telegramBot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const session = sessionManager.getSession("telegram", chatId);
    if (!session) {
      return telegramBot.sendMessage(chatId, "No active giveaway session.");
    }

    const hasPerm = msg.chat.type === "private" || await hasTelegramPermission(chatId, userId);
    if (session.ownerId !== userId && !hasPerm) {
      return telegramBot.sendMessage(chatId, "Only the session owner or admins can cancel.");
    }

    sessionManager.deleteSession("telegram", chatId);
    telegramBot.sendMessage(chatId, "Giveaway cancelled.");
  });

  // /status command
  telegramBot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const session = sessionManager.getSession("telegram", chatId);
    
    if (!session) {
      return telegramBot.sendMessage(chatId, "No active giveaway session.");
    }

    const walletCount = session.getWallets().length;
    const timeLeft = Math.max(0, session.endTime - Date.now());
    const hoursLeft = (timeLeft / (1000 * 60 * 60)).toFixed(2);

    telegramBot.sendMessage(
      chatId,
      `*Giveaway Status*\n\n` +
      `Chain: *${session.chain}*\n` +
      `Mode: *${session.mode}*\n` +
      `Winners: *${session.limit}*\n` +
      `Participants: *${walletCount}*\n` +
      `Time Left: *${hoursLeft}h*`,
      { parse_mode: "Markdown" }
    );
  });

  // Collect wallets from messages
  telegramBot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/")) return;

    const session = sessionManager.getSession("telegram", chatId);
    if (session) {
      try {
        const wallets = extractWallets(text, session.chain);
        if (wallets.length > 0) {
          wallets.forEach(w => session.addWallet(w, msg.from.id));
          console.log(`Telegram: Collected ${wallets.length} wallet(s) from ${msg.from.username || msg.from.first_name}`);
        }
      } catch (error) {
        console.error("Error extracting wallets:", error);
      }
    }
  });
}

// ============================================
// START BOTS
// ============================================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

if (DISCORD_TOKEN) {
  discordClient.login(DISCORD_TOKEN).catch(err => {
    console.error("Failed to login to Discord:", err.message);
  });
} else {
  console.warn("DISCORD_TOKEN not found - Discord bot will not start");
}

if (!TELEGRAM_TOKEN) {
  console.warn("TELEGRAM_TOKEN not found - Telegram bot will not start");
}

console.log("WalletScrapper Multi-Platform Bot Starting...");