const { ethers } = require("ethers");
const logger = require("../utils/logger");

const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS || "0x55d398326f99059fF775485246999027B3197955";
const SKIP_USDT_CHECK = process.env.SKIP_USDT_CHECK === "true";
const MIN_USDT_BALANCE = ethers.parseUnits("20", 18); // 20 USDT (18 decimals on BSC)

// Minimal ERC-20 ABI for balanceOf
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

/**
 * Check if a wallet holds >= 20 USDT on-chain
 * @param {string} walletAddress - The wallet address to check
 * @returns {Promise<{eligible: boolean, balance: string, required: string}>}
 */
async function checkUSDTBalance(walletAddress) {
  if (SKIP_USDT_CHECK) {
    logger.info(`[USDT] Check skipped (SKIP_USDT_CHECK=true) for ${walletAddress}`);
    return { eligible: true, balance: "N/A (skipped)", required: "20" };
  }

  const rpcUrl =
    process.env.BSC_RPC_URL ||
    process.env.BSC_TESTNET_RPC_URL ||
    "http://127.0.0.1:8545";

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, provider);
    const balance = await contract.balanceOf(walletAddress);
    const formatted = ethers.formatUnits(balance, 18);
    const eligible = balance >= MIN_USDT_BALANCE;

    logger.info(`[USDT] Balance check: ${walletAddress} = ${formatted} USDT, eligible=${eligible}`);

    return {
      eligible,
      balance: formatted,
      required: "20",
    };
  } catch (error) {
    logger.error(`[USDT] Balance check failed for ${walletAddress}:`, error.message);
    throw new Error("USDT 余额查询失败，请稍后重试");
  }
}

module.exports = { checkUSDTBalance };
