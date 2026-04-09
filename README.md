# Paragon DEX Testnet Bot 🚀

Automates testnet interactions on Paragon DEX (BNB Chain Testnet).

## What it does (in order)
1. **Add Liquidity** — 5× per pair, random small amounts
2. **Swap** — 5× per pair, alternating directions
3. **Zap & Stake** — 5× per pair (swap half + LP + stake in farm)
4. **Earn (Harvest)** — 5× per pair, claims rewards
5. **Remove Liquidity** — 5× per pair (unstake + remove LP)

## Setup

```bash
cd paragon-bot
npm install
cp .env.example .env
# Edit .env and paste your testnet wallet private key
```

## Run

```bash
node index.js
```

## Config
Edit `config.js` to change:
- `REPEAT_COUNT` — how many times per pair (default: 5)
- `SWAP_AMOUNT_MIN/MAX` — random amount range for swaps
- `LIQUIDITY_AMOUNT_MIN/MAX` — random amount range for liquidity
- `DELAY_MIN_MS/MAX_MS` — random delay between tx (7-15s)
- `SLIPPAGE` — slippage tolerance % (default: 20%)

## Requirements
- Testnet BNB (tBNB) for gas — get from https://testnet.bnbchain.org/faucet-smart
- Testnet tokens (the faucet on Paragon may provide these)

## ⚠️ Testnet Only!
This bot is for TESTNET usage only. Do NOT use on mainnet.
