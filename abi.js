// ═══════════════════════════════════════════════════════════════
// Paragon DEX ABIs — extracted from frontend source
// NOT standard UniswapV2! Custom router with autoYield param
// ═══════════════════════════════════════════════════════════════

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// ── Paragon Router (custom — NOT standard UniswapV2!) ─────────
// Key diff: swapExactTokensForTokens has extra `uint8 autoYieldPercent`
// Uses WNative() instead of WETH()
const ROUTER_ABI = [
  "function factory() view returns (address)",
  "function WNative() view returns (address)",
  "function masterChef() view returns (address)",
  "function paused() view returns (bool)",
  "function owner() view returns (address)",

  // Quotes
  "function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) pure returns (uint256)",
  "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) view returns (uint256)",
  "function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) view returns (uint256)",
  "function getAmountOutFor(address tokenIn, address tokenOut, uint256 amountIn) view returns (uint256)",
  "function getAmountInFor(address tokenIn, address tokenOut, uint256 amountOut) view returns (uint256)",
  "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[])",
  "function getAmountsIn(uint256 amountOut, address[] path) view returns (uint256[])",

  // Swap — note extra autoYieldPercent param!
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline, uint8 autoYieldPercent) returns (uint256[])",
  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline, uint8 autoYieldPercent) returns (uint256)",
  "function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline) returns (uint256[])",

  // Native (BNB) swaps — note extra autoYieldPercent on some
  "function swapExactNativeForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline, uint8 autoYieldPercent) payable returns (uint256[])",
  "function swapExactNativeForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline, uint8 autoYieldPercent) payable returns (uint256)",
  "function swapExactTokensForNative(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[])",
  "function swapExactTokensForNativeSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256)",
  "function swapNativeForExactTokens(uint256 amountOut, address[] path, address to, uint256 deadline) payable returns (uint256[])",
  "function swapTokensForExactNative(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline) returns (uint256[])",

  // Liquidity
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256, uint256, uint256)",
  "function addLiquidityNative(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountNativeMin, address to, uint256 deadline) payable returns (uint256, uint256, uint256)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256, uint256)",
  "function removeLiquidityNative(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountNativeMin, address to, uint256 deadline) returns (uint256, uint256)",
  "function removeLiquidityWithPermit(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) returns (uint256, uint256)",
  "function removeLiquidityNativeWithPermit(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountNativeMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) returns (uint256, uint256)",

  // Auto-yield
  "function autoYieldEnabled() view returns (bool)",
  "function autoYieldPid() view returns (uint256)",
  "function userAutoYieldBips(address) view returns (uint8)",
  "function setAutoYieldPreference(uint8 bips)",
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address)",
  "function allPairs(uint256) view returns (address)",
  "function allPairsLength() view returns (uint256)",
  "function createPair(address tokenA, address tokenB) returns (address)",
];

const PAIR_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

// ── Paragon Farm Controller (MasterChef-like, custom) ─────────
// deposit → depositFor(pid, amount, user, referrer)
// poolInfo returns 7 values
// userInfo returns 4 values
const FARM_ABI = [
  "function poolLength() view returns (uint256)",
  "function poolInfo(uint256) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accRewardPerShare, uint256 harvestDelay, uint256 totalStaked, uint256 rewardTokenStaked)",
  "function userInfo(uint256 pid, address user) view returns (uint256 amount, uint256 rewardDebt, uint256 pendingHarvest, uint256 lastDepositBlock)",
  "function pendingReward(uint256 _pid, address _user) view returns (uint256)",
  "function pendingRewardAfterFee(uint256 _pid, address _user) view returns (uint256 reward, uint256 fee)",
  "function claimableRewardAfterFee(uint256 _pid, address _user) view returns (uint256)",
  "function depositFor(uint256 _pid, uint256 _amount, address _user, address _referrer)",
  "function withdraw(uint256 _pid, uint256 _amount)",
  "function harvest(uint256 _pid)",
  "function emergencyWithdraw(uint256 _pid)",
  "function rewardToken() view returns (address)",
  "function rewardPerBlock() view returns (uint256)",
  "function totalAllocPoint() view returns (uint256)",
  "function startBlock() view returns (uint256)",
  "function availableRewards() view returns (uint256)",
  "function autoYieldDeposited(uint256 pid, address user) view returns (uint256)",
];

module.exports = {
  ERC20_ABI,
  ROUTER_ABI,
  FACTORY_ABI,
  PAIR_ABI,
  FARM_ABI,
};
