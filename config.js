// ═══════════════════════════════════════════════════════════════
// Paragon DEX Bot — Configuration
// BNB Chain Testnet (chainId: 97)
// ═══════════════════════════════════════════════════════════════

module.exports = {
  RPC_URL: "https://data-seed-prebsc-1-s1.binance.org:8545",
  CHAIN_ID: 97,

  // ── Core Contracts ──────────────────────────────────────────
  ROUTER:          "0x5e9521b9BA4EA3897933b422bF36A12f422D3b1F",
  FACTORY:         "0x1Ada69Cb8a2BCb755CF76cf6040f1CDB243A9b28",
  FARM_CONTROLLER: "0x031C4b7B213354558A8D018E32282Ed86132fd90",
  FAUCET:          "0x114395fd82492b9970d8109c39eb91106e7ec886",

  // ── Tokens ──────────────────────────────────────────────────
  WBNB: "0xd81437b6f0f9b7de37bf8092f68b550a39594801",
  USDT: "0x6ef1f996008b0ef1f29aa1bf67c59747713f760d",
  USDC: "0xd786fe32daf619fb772daedce24eb66a8e48b3c2",
  XPGN: "0xfC2E6B2232D8ece582b3Ba6c66bf9d19cE49A7B5",
  XRP:  "0x76b7cf5820de92ce8c3644797457fccd568c0d99",
  BTC:  "0x59d42eaa60f9bf7344a9d98924c795b16959b6a3",
  ETH:  "0x0dcd37610303673073a84fbb9edc8f493fc4d3df",
  CAKE: "0x64a09c9d8819e45f97672efe15402f1d7dc32354",
  BNB:  "0x61c029c40d75622c1061df4655ae065b7eab1f38",
  SOL:  "0x8de45fe608e6d22e9577aa43f928ea59dc1015ea",
  DOGE: "0x7e7a5203f2e93bba395f6f30290c94a59f3c9a66",
  ADA:  "0x04bf2fd3643eaa157bb685a8288ccfe0fcb60878",
  TRX:  "0x5f19ab01579f58d9563964053494b18006f390e3",
  LINK: "0xe2562d0924e04f1a6c8610585383464aa707f59c",
  SHIB: "0x78e5de8a0ad50cbcfeed7d6384dfeb43d7fe21bb",

  // ── Known Pairs (LP) ────────────────────────────────────────
  XPGN_USDT_PAIR: "0x36668326B752cD061Dd81D10EFD8010F679ece5D",
  XPGN_WBNB_PAIR: "0x6901aca7A6557Ca0Cb9B3AFb323f18d0ae51f9A0",

  // ── Bot Settings ────────────────────────────────────────────
  REPEAT_COUNT: 5,
  SLIPPAGE: 20,                 // slippage tolerance % (testnet needs higher)
  GAS_LIMIT: 500_000,
  DELAY_MIN_MS: 7_000,          // min delay between tx (7s)
  DELAY_MAX_MS: 15_000,         // max delay between tx (15s)

  // ── Random Amount Ranges (in token units, NOT wei) ──────────
  // Default small amounts for non-stablecoin tokens
  SWAP_AMOUNT_MIN: "0.0003",
  SWAP_AMOUNT_MAX: "0.0012",
  LIQUIDITY_AMOUNT_MIN: "0.0002",
  LIQUIDITY_AMOUNT_MAX: "0.001",

  // Stablecoin amounts (USDC/USDT) → random 1-10
  STABLE_SWAP_AMOUNT_MIN: "1",
  STABLE_SWAP_AMOUNT_MAX: "10",
  STABLE_LIQUIDITY_AMOUNT_MIN: "1",
  STABLE_LIQUIDITY_AMOUNT_MAX: "10",

  // Stablecoin addresses (lowercase for matching)
  STABLECOINS: [
    "0x6ef1f996008b0ef1f29aa1bf67c59747713f760d",  // USDT
    "0xd786fe32daf619fb772daedce24eb66a8e48b3c2",  // USDC
  ],
};
