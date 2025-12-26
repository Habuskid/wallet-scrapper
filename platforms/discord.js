const { Client, GatewayIntentBits } = require("discord.js");
const { extractWallets } = require("./wallets");
const { Session } = require("./session");
const { pickWinners } = require("./picker");
const { generateSeed } = require("./proof");
const { formatMarkdown } = require("./export");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const sessions = new Map(); // channelId -> session

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const cmd = args[0];

  // start session: !start evm raffle 10 6
  if (cmd === "!start") {
    const [ , chain, mode, limit, duration] = args;
    const session = new Session(message.channel.id, chain, mode, parseInt(limit), parseInt(duration), message.author.id);
    sessions.set(message.channel.id, session);
    return message.reply(`Session started for chain ${chain} for ${duration}h`);
  }

  // collect wallets
  const session = sessions.get(message.channel.id);
  if (session) {
    const wallets = extractWallets(message.content, session.chain);
    wallets.forEach(w => session.addWallet(w));
  }

  // finalize: !finalize
  if (cmd === "!finalize") {
    if (!session) return message.reply("No active session");
    if (session.ownerId !== message.author.id) return message.reply("Only the session owner can finalize");

    const seed = generateSeed(session.id, session.endTime, session.getWallets().length);
    const winners = pickWinners(session.getWallets(), session.mode, session.limit, seed);
    const output = formatMarkdown(winners);

    message.reply(` Winners:\n${output}\nProof seed: ${seed}`);
    sessions.delete(message.channel.id);
  }
});

client.login("YOUR_DISCORD_BOT_TOKEN");
