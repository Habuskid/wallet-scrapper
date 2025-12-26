const walletPatterns = {
  evm: /\b0x[a-fA-F0-9]{40}\b/g,
  sol: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
  btc: /\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b/g,
  canton: /\b[a-f0-9]{6,14}\s*::\s*[a-f0-9]{50,90}\b/gi
};

function extractWallets(text, type) {
  const regex = walletPatterns[type];
  if (!regex) throw new Error(`Unsupported wallet type: ${type}`);
  const matches = text.match(regex) || [];
  return [...new Set(matches)]; // deduplicate
}

module.exports = { extractWallets };
