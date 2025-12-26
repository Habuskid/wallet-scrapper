class Session {
  constructor(id, chain, mode, limit, duration, ownerId) {
    this.id = id;           // session ID (tweetId, Discord channel, Telegram chat)
    this.chain = chain;
    this.mode = mode;
    this.limit = limit;
    this.endTime = Date.now() + duration * 60 * 60 * 1000;
    this.ownerId = ownerId; // user ID who owns this session
    this.wallets = new Set();
  }

  addWallet(wallet) {
    if (Date.now() > this.endTime) return false;
    this.wallets.add(wallet);
    return true;
  }

  getWallets() {
    return [...this.wallets];
  }
}

module.exports = { Session };
