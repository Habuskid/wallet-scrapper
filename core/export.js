function formatMarkdown(wallets) {
  return wallets.map(w => `- \`${w}\``).join("\n");
}

module.exports = { formatMarkdown };
