const crypto = require("crypto");

function generateSeed(sessionId, endTime, walletCount) {
  return crypto
    .createHash("sha256")
    .update(`${sessionId}-${endTime}-${walletCount}`)
    .digest("hex");
}

module.exports = { generateSeed };
