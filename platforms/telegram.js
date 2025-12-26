// telegram.js
const TelegramBot = require('node-telegram-bot-api');
const WalletCollector = require('./core/wallets');

// Replace with your Telegram bot token from BotFather
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN_HERE';

// Create bot instance
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const walletCollector = new WalletCollector();

console.log('Telegram bot is starting...');

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome! Send me messages and I will extract wallet addresses.');
});

// Handle all text messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  // Extract wallets from the message
  const wallets = walletCollector.extractWallets(text);

  if (wallets.length > 0) {
    console.log(`Collected ${wallets.length} wallet(s) from ${msg.from.username || msg.from.first_name}`);
    
    const response = `Found ${wallets.length} wallet address(es):\n${wallets.join('\n')}`;
    bot.sendMessage(chatId, response);
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('Telegram bot is ready!');
