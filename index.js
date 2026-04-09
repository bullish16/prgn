#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  Paragon DEX Testnet Bot
//  Order: Add Liquidity → Swap → Zap & Stake → Earn → Remove Liquidity
//  5× per pair, random small amounts, 7-15s delay
// ═══════════════════════════════════════════════════════════════
require("dotenv").config();
const { ethers } = require("ethers");
const CFG   = require("./config");
const ABI   = require("./abi");
const {
  randomDelay, randomAmount, deadline, withSlippage,
  fmt, short, step, sub, isStable, swapAmount, liqAmount,
} = require("./utils");

// ── Setup ─────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(CFG.RPC_URL, CFG.CHAIN_ID);
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const router   = new ethers.Contract(CFG.ROUTER, ABI.ROUTER_ABI, wallet);
const factory  = new ethers.Contract(CFG.FACTORY, ABI.FACTORY_ABI, wallet);
const farm     = new ethers.Contract(CFG.FARM_CONTROLLER, ABI.FARM_ABI, wallet);

// Zero address for referrer (no referral)
const ZERO_ADDR = ethers.ZeroAddress;

// ── Token helpers ─────────────────────────────────────────────
function erc20(addr) { return new ethers.Contract(addr, ABI.ERC20_ABI, wallet); }
function pairContract(addr) { return new ethers.Contract(addr, ABI.PAIR_ABI, wallet); }

const TOKEN_NAME_CACHE = {};
async function tokenSymbol(addr) {
  if (TOKEN_NAME_CACHE[addr]) return TOKEN_NAME_CACHE[addr];
  try {
    const sym = await erc20(addr).symbol();
    TOKEN_NAME_CACHE[addr] = sym;
    return sym;
  } catch {
    return short(addr);
  }
}

const TOKEN_DEC_CACHE = {};
async function tokenDecimals(addr) {
  if (TOKEN_DEC_CACHE[addr] !== undefined) return TOKEN_DEC_CACHE[addr];
  try {
    const dec = Number(await erc20(addr).decimals());
    TOKEN_DEC_CACHE[addr] = dec;
    return dec;
  } catch { return 18; }
}

// ── Approve helper (approve max if needed) ────────────────────
async function ensureApproval(tokenAddr, spender, amount) {
  const token = erc20(tokenAddr);
  const sym = await tokenSymbol(tokenAddr);
  const allowance = await token.allowance(wallet.address, spender);
  if (allowance >= amount) return;
  console.log(`   🔓 Approving ${sym} for ${short(spender)}...`);
  const tx = await token.approve(spender, ethers.MaxUint256, { gasLimit: CFG.GAS_LIMIT });
  await tx.wait();
  console.log(`   ✅ Approved (tx: ${short(tx.hash)})`);
  await randomDelay();
}

// ── Discover pairs from factory ───────────────────────────────
async function discoverPairs() {
  console.log("\n🔍 Discovering pairs from factory...");
  const len = await factory.allPairsLength();
  console.log(`   Found ${len} pairs on-chain`);

  const pairs = [];
  for (let i = 0; i < Number(len); i++) {
    const pairAddr = await factory.allPairs(i);
    const p = pairContract(pairAddr);
    const [t0, t1] = await Promise.all([p.token0(), p.token1()]);
    const [s0, s1] = await Promise.all([tokenSymbol(t0), tokenSymbol(t1)]);

    // Check reserves — skip empty pools
    try {
      const res = await p.getReserves();
      if (res[0] === 0n && res[1] === 0n) {
        console.log(`   ⚠️  Pair #${i} ${s0}/${s1} — empty, skipping`);
        continue;
      }
    } catch { continue; }

    pairs.push({ address: pairAddr, token0: t0, token1: t1, sym0: s0, sym1: s1, pid: null });
    console.log(`   ✅ Pair #${i}: ${s0}/${s1} (${short(pairAddr)})`);
  }
  return pairs;
}

// ── Discover farm pools and map to LP pair addresses ──────────
async function mapFarmPools(pairs) {
  console.log("\n🌾 Discovering farm pools...");
  let poolLen;
  try { poolLen = await farm.poolLength(); } catch { console.log("   ⚠️  Could not read poolLength, skipping farm mapping"); return pairs; }

  console.log(`   Found ${poolLen} farm pools`);
  for (let pid = 0; pid < Number(poolLen); pid++) {
    try {
      const info = await farm.poolInfo(pid);
      const lpToken = info[0]; // lpToken is first return value
      const match = pairs.find(p => p.address.toLowerCase() === lpToken.toLowerCase());
      if (match) {
        match.pid = pid;
        console.log(`   ✅ Pool #${pid} → ${match.sym0}/${match.sym1}`);
      } else {
        console.log(`   ℹ️  Pool #${pid} LP ${short(lpToken)} — no matching pair`);
      }
    } catch (e) {
      console.log(`   ⚠️  Pool #${pid} read failed: ${e.message?.slice(0, 60)}`);
    }
  }
  return pairs;
}

// ═══════════════════════════════════════════════════════════════
//  STEP 1: ADD LIQUIDITY (5× per pair)
// ═══════════════════════════════════════════════════════════════
async function doAddLiquidity(pairs) {
  step("ADD LIQUIDITY");
  for (const p of pairs) {
    console.log(`\n  📊 Pair: ${p.sym0}/${p.sym1}`);
    const dec0 = await tokenDecimals(p.token0);
    const dec1 = await tokenDecimals(p.token1);

    for (let i = 1; i <= CFG.REPEAT_COUNT; i++) {
      sub(i, CFG.REPEAT_COUNT, `Adding liquidity ${p.sym0}/${p.sym1}`);
      try {
        // Get reserves to calculate proper ratio
        const pairC = pairContract(p.address);
        const reserves = await pairC.getReserves();
        const r0 = reserves[0];
        const r1 = reserves[1];

        const amtA = liqAmount(p.token0, dec0);
        // Calculate amtB based on pool ratio
        let amtB;
        try {
          amtB = await router.quote(amtA, r0, r1);
        } catch {
          amtB = liqAmount(p.token1, dec1);
        }

        console.log(`   💰 ${fmt(amtA, dec0)} ${p.sym0} + ${fmt(amtB, dec1)} ${p.sym1}`);

        await ensureApproval(p.token0, CFG.ROUTER, amtA);
        await ensureApproval(p.token1, CFG.ROUTER, amtB);

        const tx = await router.addLiquidity(
          p.token0, p.token1,
          amtA, amtB,
          withSlippage(amtA), withSlippage(amtB),
          wallet.address, deadline(),
          { gasLimit: CFG.GAS_LIMIT }
        );
        const receipt = await tx.wait();
        console.log(`   ✅ Liquidity added! tx: ${short(tx.hash)} (gas: ${receipt.gasUsed})`);
      } catch (e) {
        console.log(`   ❌ Failed: ${e.shortMessage || e.message?.slice(0, 120)}`);
      }
      await randomDelay();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  STEP 2: SWAP (5× per pair, both directions)
//  NOTE: autoYieldPercent = 0 (no auto-yield)
// ═══════════════════════════════════════════════════════════════
async function doSwap(pairs) {
  step("SWAP");
  for (const p of pairs) {
    console.log(`\n  📊 Pair: ${p.sym0}/${p.sym1}`);
    const dec0 = await tokenDecimals(p.token0);
    const dec1 = await tokenDecimals(p.token1);

    for (let i = 1; i <= CFG.REPEAT_COUNT; i++) {
      // Alternate direction: odd = 0→1, even = 1→0
      const forward = i % 2 === 1;
      const [fromToken, toToken] = forward ? [p.token0, p.token1] : [p.token1, p.token0];
      const [fromSym, toSym]     = forward ? [p.sym0, p.sym1]     : [p.sym1, p.sym0];
      const fromDec = forward ? dec0 : dec1;

      sub(i, CFG.REPEAT_COUNT, `Swap ${fromSym} → ${toSym}`);
      try {
        const amtIn = swapAmount(fromToken, fromDec);
        console.log(`   💱 ${fmt(amtIn, fromDec)} ${fromSym} → ${toSym}`);

        await ensureApproval(fromToken, CFG.ROUTER, amtIn);

        // Get expected output
        let amtOutMin;
        try {
          const amounts = await router.getAmountsOut(amtIn, [fromToken, toToken]);
          amtOutMin = withSlippage(amounts[1]);
        } catch {
          amtOutMin = 0n;
        }

        // Paragon swap: extra param autoYieldPercent = 0
        const tx = await router.swapExactTokensForTokens(
          amtIn, amtOutMin,
          [fromToken, toToken],
          wallet.address, deadline(),
          0,  // autoYieldPercent
          { gasLimit: CFG.GAS_LIMIT }
        );
        const receipt = await tx.wait();
        console.log(`   ✅ Swapped! tx: ${short(tx.hash)} (gas: ${receipt.gasUsed})`);
      } catch (e) {
        console.log(`   ❌ Failed: ${e.shortMessage || e.message?.slice(0, 120)}`);
      }
      await randomDelay();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  STEP 3: ZAP & STAKE (5× per pair with farm pool)
//  Zap = swap half of tokenA into tokenB, then addLiquidity, then stake LP
// ═══════════════════════════════════════════════════════════════
async function doZapAndStake(pairs) {
  step("ZAP & STAKE");
  const farmPairs = pairs.filter(p => p.pid !== null);
  if (farmPairs.length === 0) {
    console.log("  ⚠️  No farm pools found, skipping Zap & Stake");
    return;
  }

  for (const p of farmPairs) {
    console.log(`\n  📊 Pair: ${p.sym0}/${p.sym1} (Farm PID: ${p.pid})`);
    const dec0 = await tokenDecimals(p.token0);
    const dec1 = await tokenDecimals(p.token1);

    for (let i = 1; i <= CFG.REPEAT_COUNT; i++) {
      sub(i, CFG.REPEAT_COUNT, `Zap & Stake ${p.sym0}/${p.sym1}`);
      try {
        // 1) Take a random amount of token0
        const totalAmt = liqAmount(p.token0, dec0);
        const halfAmt  = totalAmt / 2n;

        console.log(`   🔄 Zap: swap ${fmt(halfAmt, dec0)} ${p.sym0} → ${p.sym1}`);
        await ensureApproval(p.token0, CFG.ROUTER, totalAmt);

        // 2) Swap half to token1
        let receivedB;
        try {
          const amounts = await router.getAmountsOut(halfAmt, [p.token0, p.token1]);
          receivedB = amounts[1];
          const txSwap = await router.swapExactTokensForTokens(
            halfAmt, withSlippage(receivedB),
            [p.token0, p.token1],
            wallet.address, deadline(),
            0,  // autoYieldPercent
            { gasLimit: CFG.GAS_LIMIT }
          );
          await txSwap.wait();
          console.log(`   ✅ Zap swap done`);
        } catch (e) {
          console.log(`   ❌ Zap swap failed: ${e.shortMessage || e.message?.slice(0, 80)}`);
          await randomDelay();
          continue;
        }
        await randomDelay();

        // 3) Add liquidity with remaining half + received
        const remainA = halfAmt;
        // Re-quote for correct ratio
        let addB;
        try {
          const pairC = pairContract(p.address);
          const reserves = await pairC.getReserves();
          addB = await router.quote(remainA, reserves[0], reserves[1]);
        } catch {
          addB = withSlippage(receivedB);
        }

        console.log(`   💧 Adding liquidity: ${fmt(remainA, dec0)} ${p.sym0} + ${fmt(addB, dec1)} ${p.sym1}`);
        await ensureApproval(p.token1, CFG.ROUTER, addB);

        const lpBefore = await pairContract(p.address).balanceOf(wallet.address);
        try {
          const txLp = await router.addLiquidity(
            p.token0, p.token1,
            remainA, addB,
            withSlippage(remainA), withSlippage(addB),
            wallet.address, deadline(),
            { gasLimit: CFG.GAS_LIMIT }
          );
          await txLp.wait();
          const lpAfter = await pairContract(p.address).balanceOf(wallet.address);
          const lpReceived = lpAfter - lpBefore;
          console.log(`   ✅ LP received: ${fmt(lpReceived)}`);

          // 4) Stake LP in farm using depositFor
          if (lpReceived > 0n) {
            console.log(`   🌾 Staking LP in Farm PID ${p.pid}...`);
            await ensureApproval(p.address, CFG.FARM_CONTROLLER, lpReceived);
            await randomDelay();
            try {
              const txStake = await farm.depositFor(
                p.pid, lpReceived, wallet.address, ZERO_ADDR,
                { gasLimit: CFG.GAS_LIMIT }
              );
              await txStake.wait();
              console.log(`   ✅ Staked! tx: ${short(txStake.hash)}`);
            } catch (e) {
              console.log(`   ❌ Stake failed: ${e.shortMessage || e.message?.slice(0, 80)}`);
            }
          }
        } catch (e) {
          console.log(`   ❌ AddLiquidity failed: ${e.shortMessage || e.message?.slice(0, 80)}`);
        }
      } catch (e) {
        console.log(`   ❌ ZapStake error: ${e.shortMessage || e.message?.slice(0, 120)}`);
      }
      await randomDelay();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  STEP 4: EARN / HARVEST (5× per pair with farm pool)
// ═══════════════════════════════════════════════════════════════
async function doEarn(pairs) {
  step("EARN (HARVEST REWARDS)");
  const farmPairs = pairs.filter(p => p.pid !== null);
  if (farmPairs.length === 0) {
    console.log("  ⚠️  No farm pools found, skipping Earn");
    return;
  }

  for (const p of farmPairs) {
    console.log(`\n  📊 Pair: ${p.sym0}/${p.sym1} (Farm PID: ${p.pid})`);

    for (let i = 1; i <= CFG.REPEAT_COUNT; i++) {
      sub(i, CFG.REPEAT_COUNT, `Harvest ${p.sym0}/${p.sym1}`);
      try {
        // Check pending rewards
        let pending = 0n;
        try {
          pending = await farm.pendingReward(p.pid, wallet.address);
        } catch {}
        console.log(`   🎁 Pending reward: ${fmt(pending)} XPGN`);

        // Harvest using explicit harvest() function
        const tx = await farm.harvest(p.pid, { gasLimit: CFG.GAS_LIMIT });
        await tx.wait();
        console.log(`   ✅ Harvested! tx: ${short(tx.hash)}`);
      } catch (e) {
        console.log(`   ❌ Harvest failed: ${e.shortMessage || e.message?.slice(0, 120)}`);
      }
      await randomDelay();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  STEP 5: REMOVE LIQUIDITY (5× per pair)
// ═══════════════════════════════════════════════════════════════
async function doRemoveLiquidity(pairs) {
  step("REMOVE LIQUIDITY");
  for (const p of pairs) {
    console.log(`\n  📊 Pair: ${p.sym0}/${p.sym1}`);

    for (let i = 1; i <= CFG.REPEAT_COUNT; i++) {
      sub(i, CFG.REPEAT_COUNT, `Remove liquidity ${p.sym0}/${p.sym1}`);
      try {
        // First unstake from farm if staked
        if (p.pid !== null) {
          try {
            const info = await farm.userInfo(p.pid, wallet.address);
            const staked = info[0]; // amount is first return value
            if (staked > 0n) {
              // Withdraw portion: 1/remaining each time
              const remaining = CFG.REPEAT_COUNT - i + 1;
              const withdrawAmt = i === CFG.REPEAT_COUNT ? staked : staked / BigInt(remaining);
              console.log(`   🌾 Unstaking ${fmt(withdrawAmt)} LP from Farm PID ${p.pid}`);
              const txW = await farm.withdraw(p.pid, withdrawAmt, { gasLimit: CFG.GAS_LIMIT });
              await txW.wait();
              console.log(`   ✅ Unstaked`);
              await randomDelay();
            }
          } catch (e) {
            console.log(`   ⚠️  Unstake failed: ${e.shortMessage || e.message?.slice(0, 60)}`);
          }
        }

        // Get LP balance
        const lp = pairContract(p.address);
        const lpBal = await lp.balanceOf(wallet.address);
        if (lpBal === 0n) {
          console.log(`   ⚠️  No LP balance, skipping`);
          continue;
        }

        // Remove portion each time
        const remaining = CFG.REPEAT_COUNT - i + 1;
        const removeAmt = i === CFG.REPEAT_COUNT ? lpBal : lpBal / BigInt(remaining);
        console.log(`   🔥 Removing ${fmt(removeAmt)} LP`);

        await ensureApproval(p.address, CFG.ROUTER, removeAmt);

        const tx = await router.removeLiquidity(
          p.token0, p.token1,
          removeAmt,
          0n, 0n, // accept any amount back (testnet)
          wallet.address, deadline(),
          { gasLimit: CFG.GAS_LIMIT }
        );
        const receipt = await tx.wait();
        console.log(`   ✅ Liquidity removed! tx: ${short(tx.hash)} (gas: ${receipt.gasUsed})`);
      } catch (e) {
        console.log(`   ❌ Failed: ${e.shortMessage || e.message?.slice(0, 120)}`);
      }
      await randomDelay();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║         PARAGON DEX TESTNET BOT  🚀                    ║");
  console.log("║  Add Liq → Swap → Zap&Stake → Earn → Remove Liq       ║");
  console.log("║  5× per pair · random amounts · 7-15s delay            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  console.log(`\n  Wallet: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`  BNB Balance: ${ethers.formatEther(balance)} tBNB`);

  if (balance === 0n) {
    console.log("\n  ❌ No tBNB! Get testnet BNB from https://testnet.bnbchain.org/faucet-smart");
    process.exit(1);
  }

  // Verify router is not paused
  try {
    const paused = await router.paused();
    if (paused) {
      console.log("\n  ❌ Router is PAUSED! Cannot execute transactions.");
      process.exit(1);
    }
    console.log("  ✅ Router is active (not paused)");
  } catch {}

  // Check token balances
  console.log("\n  Token balances:");
  const tokenList = [
    ["WBNB", CFG.WBNB], ["USDT", CFG.USDT], ["USDC", CFG.USDC],
    ["XPGN", CFG.XPGN], ["ETH", CFG.ETH], ["BTC", CFG.BTC],
  ];
  for (const [name, addr] of tokenList) {
    try {
      const bal = await erc20(addr).balanceOf(wallet.address);
      const dec = await tokenDecimals(addr);
      console.log(`    ${name.padEnd(6)}: ${fmt(bal, dec)}`);
    } catch {
      console.log(`    ${name.padEnd(6)}: (read error)`);
    }
  }

  // Discover pairs
  let pairs = await discoverPairs();
  if (pairs.length === 0) {
    console.log("\n  ❌ No active pairs found!");
    process.exit(1);
  }

  // Map farm pools
  pairs = await mapFarmPools(pairs);

  const startTime = Date.now();
  console.log(`\n  🎯 Starting bot with ${pairs.length} pairs × ${CFG.REPEAT_COUNT} repeats`);
  console.log(`  📊 Estimated transactions: ~${pairs.length * CFG.REPEAT_COUNT * 5}`);

  // ── Execute in order ──────────────────────────────────
  await doAddLiquidity(pairs);
  await doSwap(pairs);
  await doZapAndStake(pairs);
  await doEarn(pairs);
  await doRemoveLiquidity(pairs);

  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  🏁 ALL DONE! Total time: ${elapsed} minutes`);
  console.log(`${"═".repeat(60)}`);
}

main().catch((e) => {
  console.error("\n💀 FATAL:", e.message);
  process.exit(1);
});
