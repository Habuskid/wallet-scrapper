const crypto = require("crypto");

function pickWinners(wallets, mode, limit, seed = null) {
  const arr = [...wallets];

  if (mode === "fcfs") {
    return arr.slice(0, limit);
  } else if (mode === "raffle") {
    // deterministic shuffle if seed is provided
    if (seed) {
      const rng = crypto.createHash("sha256").update(seed).digest();
      arr.sort((a, b) => {
        const hashA = crypto.createHash("sha256").update(a + rng).digest("hex");
        const hashB = crypto.createHash("sha256").update(b + rng).digest("hex");
        return hashA.localeCompare(hashB);
      });
    }
    return arr.slice(0, limit);
  } else {
    throw new Error("Invalid mode");
  }
}

module.exports = { pickWinners };
