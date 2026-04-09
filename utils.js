// ═══════════════════════════════════════════════════════════════
// Utility helpers
// ═══════════════════════════════════════════════════════════════
const { ethers } = require("ethers");
const CFG = require("./config");

/** Sleep for a random duration between DELAY_MIN_MS and DELAY_MAX_MS */
function randomDelay() {
  const ms = Math.floor(
    CFG.DELAY_MIN_MS + Math.random() * (CFG.DELAY_MAX_MS - CFG.DELAY_MIN_MS)
  );
  console.log(`   ⏳ waiting ${(ms / 1000).toFixed(1)}s ...`);
  return new Promise((r) => setTimeout(r, ms));
}

/** Return a random BigInt amount between min and max (string, in token units) for given decimals */
function randomAmount(minStr, maxStr, decimals = 18) {
  const min = parseFloat(minStr);
  const max = parseFloat(maxStr);
  const val = min + Math.random() * (max - min);
  // Round to 8 decimal places to avoid floating weirdness
  const rounded = val.toFixed(8);
  return ethers.parseUnits(rounded, decimals);
}

/** Deadline = now + 20 minutes */
function deadline() {
  return Math.floor(Date.now() / 1000) + 20 * 60;
}

/** Calculate minimum output with slippage */
function withSlippage(amount) {
  return (amount * BigInt(100 - CFG.SLIPPAGE)) / 100n;
}

/** Pretty-print token amount */
function fmt(amount, decimals = 18, dp = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(dp);
}

/** Short address */
function short(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Log a step header */
let stepNum = 0;
function step(msg) {
  stepNum++;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  STEP ${stepNum}: ${msg}`);
  console.log(`${"═".repeat(60)}`);
}

/** Log sub-step */
function sub(iter, total, msg) {
  console.log(`\n  [${iter}/${total}] ${msg}`);
}

module.exports = {
  randomDelay,
  randomAmount,
  deadline,
  withSlippage,
  fmt,
  short,
  step,
  sub,
};
