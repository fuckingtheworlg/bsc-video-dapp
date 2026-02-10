const { ethers } = require("ethers");
const logger = require("../utils/logger");

const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS || "0x55d398326f99059fF775485246999027B3197955";
const SKIP_USDT_CHECK = process.env.SKIP_USDT_CHECK === "true";
const MIN_USD_VALUE = 20; // Minimum 20 USD equivalent

// Chainlink BNB/USD Price Feed on BSC Mainnet
const BNB_USD_FEED = process.env.BNB_USD_PRICE_FEED || "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";

// Minimal ABIs
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
const CHAINLINK_ABI = ["function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"];

/**
 * Get BNB price in USD from Chainlink oracle
 * @param {ethers.Provider} provider
 * @returns {Promise<number>} BNB price in USD
 */
async function getBnbPrice(provider) {
  try {
    const feed = new ethers.Contract(BNB_USD_FEED, CHAINLINK_ABI, provider);
    const [, answer] = await feed.latestRoundData();
    // Chainlink BNB/USD has 8 decimals
    const price = Number(ethers.formatUnits(answer, 8));
    logger.info(`[BNB] Current price: $${price.toFixed(2)}`);
    return price;
  } catch (error) {
    logger.warn(`[BNB] Price feed unavailable: ${error.message}`);
    return 0;
  }
}

/**
 * Check if a wallet is eligible: USDT >= 20 OR BNB value >= 20 USD
 * @param {string} walletAddress - The wallet address to check
 * @returns {Promise<{eligible: boolean, usdtBalance: string, bnbBalance: string, bnbValueUsd: string, required: string}>}
 */
async function checkUSDTBalance(walletAddress) {
  if (SKIP_USDT_CHECK) {
    logger.info(`[Balance] Check skipped (SKIP_USDT_CHECK=true) for ${walletAddress}`);
    return { eligible: true, usdtBalance: "N/A", bnbBalance: "N/A", bnbValueUsd: "N/A", required: "20" };
  }

  const rpcUrl =
    process.env.BSC_RPC_URL ||
    process.env.BSC_TESTNET_RPC_URL ||
    "http://127.0.0.1:8545";

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Check USDT balance
    let usdtFormatted = "0";
    let usdtEligible = false;
    try {
      const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, provider);
      const usdtBalance = await usdtContract.balanceOf(walletAddress);
      usdtFormatted = ethers.formatUnits(usdtBalance, 18);
      usdtEligible = Number(usdtFormatted) >= MIN_USD_VALUE;
    } catch (e) {
      logger.warn(`[USDT] Balance check failed: ${e.message}`);
    }

    // Check BNB balance + price
    let bnbFormatted = "0";
    let bnbValueUsd = 0;
    let bnbEligible = false;
    try {
      const bnbBalance = await provider.getBalance(walletAddress);
      bnbFormatted = ethers.formatEther(bnbBalance);
      const bnbPrice = await getBnbPrice(provider);
      bnbValueUsd = Number(bnbFormatted) * bnbPrice;
      bnbEligible = bnbValueUsd >= MIN_USD_VALUE;
    } catch (e) {
      logger.warn(`[BNB] Balance check failed: ${e.message}`);
    }

    const eligible = usdtEligible || bnbEligible;

    logger.info(
      `[Balance] ${walletAddress}: USDT=${usdtFormatted}, BNB=${bnbFormatted} ($${bnbValueUsd.toFixed(2)}), eligible=${eligible}`
    );

    return {
      eligible,
      usdtBalance: usdtFormatted,
      bnbBalance: bnbFormatted,
      bnbValueUsd: bnbValueUsd.toFixed(2),
      required: "20",
    };
  } catch (error) {
    logger.error(`[Balance] Check failed for ${walletAddress}:`, error.message);
    throw new Error("余额查询失败，请稍后重试");
  }
}

module.exports = { checkUSDTBalance };
