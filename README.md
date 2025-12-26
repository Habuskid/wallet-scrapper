# WalletScrapper - Multi-Platform Bot

A unified giveaway management system for **Discord**, **Telegram**, and **Twitter** (coming soon).

## Features

- **Multi-Chain Support**: EVM, Solana, Bitcoin, Canton
- **Two Modes**: First-Come-First-Serve (FCFS) & Raffle
- **Provably Fair**: Cryptographic seed generation
- **Permission Control**: Admin/moderator restrictions
- **Session Management**: Isolated sessions per channel/chat
- **Auto Wallet Collection**: Extracts wallets from messages

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_discord_bot_token_here
TELEGRAM_TOKEN=your_telegram_bot_token_here
```

### 3. Get Your Bot Tokens

#### Discord:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" tab → Add Bot
4. Copy the token
5. Enable "Message Content Intent" under Privileged Gateway Intents
6. Invite bot with these permissions: Send Messages, Read Messages, Read Message History

#### Telegram:
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow instructions
3. Copy the token provided
4. Add your bot to a group and promote it to admin (for group giveaways)

### 4. Run the Bot

```bash
npm start
```

---

## Commands

### Discord Commands (prefix: `!`)

| Command | Description | Example |
|---------|-------------|---------|
| `!start <chain> <mode> <winners> <duration>` | Start a giveaway | `!start evm raffle 10 6` |
| `!finalize` | End giveaway and select winners | `!finalize` |
| `!cancel` | Cancel the giveaway | `!cancel` |
| `!status` | Check giveaway status | `!status` |

### Telegram Commands (prefix: `/`)

| Command | Description | Example |
|---------|-------------|---------|
| `/giveaway <chain> <mode> <winners> <duration>` | Start a giveaway | `/giveaway evm raffle 10 6` |
| `/finalize` | End giveaway and select winners | `/finalize` |
| `/cancel` | Cancel the giveaway | `/cancel` |
| `/status` | Check giveaway status | `/status` |
| `/start` | Show help message | `/start` |

---

## Supported Chains

- **evm**: Ethereum, Polygon, BSC, etc. (0x... addresses)
- **sol**: Solana (base58 addresses)
- **btc**: Bitcoin (bc1, 1, 3 addresses)
- **canton**: Canton Network

---

## Giveaway Modes

1. **fcfs** (First-Come-First-Serve): First N participants win
2. **raffle**: Random selection using cryptographic seed

---

## Permissions

### Discord:
- Server Administrator
- Manage Messages
- Manage Server
- OR specific roles: "Moderator", "Admin", "Staff", "Team", "Giveaway Manager"

### Telegram:
- Chat Creator
- Chat Administrator

---

## Project Structure

```
wallet-scrapper/
├── index.js                 # Main unified bot file
├── core/
│   ├── wallets.js          # Wallet extraction logic
│   ├── session.js          # Session management
│   ├── picker.js           # Winner selection
│   ├── proof.js            # Seed generation
│   └── export.js           # Output formatting
├── .env                    # Environment variables
├── package.json
└── README.md
```

---

## Coming Soon

- **Twitter/X Integration**: Thread-based giveaways
- **Database Storage**: Persistent session management
- **Web Dashboard**: Monitor all giveaways
- **Analytics**: Participation metrics
- **Multi-Winner Tiers**: Different prize levels

---

## Troubleshooting

### Discord bot not responding?
- Check if Message Content Intent is enabled
- Verify bot has proper permissions in the server
- Ensure DISCORD_TOKEN is correct in `.env`

### Telegram bot not responding?
- Verify bot is added to the group
- Make bot an admin in groups (for permission checks)
- Check TELEGRAM_TOKEN in `.env`

### Wallets not being collected?
- Ensure session is active (`!status` or `/status`)
- Check if wallet format matches the chain specified
- Verify chain parameter is correct (evm, sol, btc, canton)

---

## Example Usage

### Discord:
```
Moderator: !start evm raffle 5 24
Bot: Giveaway Started! Chain: evm, Mode: raffle, Winners: 5, Duration: 24h

User1: My wallet is 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
User2: 0x123...abc
User3: Here's mine: 0x456...def

Moderator: !status
Bot: Giveaway Status - Participants: 3, Time Left: 23.5h

Moderator: !finalize
Bot: Winners Selected! [list of winners] Total Participants: 3
```

### Telegram:
```
Admin: /giveaway sol raffle 3 12
Bot: Giveaway Started! Chain: sol, Mode: raffle...

User1: DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK
User2: My SOL address: AbCd...XyZ

Admin: /finalize
Bot: Winners Selected! [list of winners]
```

---

## License

MIT License - feel free to modify and use for your projects!

---

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

---

**Built for the crypto community**