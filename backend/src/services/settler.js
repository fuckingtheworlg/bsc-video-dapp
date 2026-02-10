const cron = require("node-cron");
const { ethers } = require("ethers");
const logger = require("../utils/logger");

const VIDEO_INTERACTION_ABI = [
  "function isRoundSettleable() view returns (bool)",
  "function settleRound() external",
  "function currentRoundId() view returns (uint256)",
  "function timeUntilRoundEnd() view returns (uint256)",
];

let provider = null;
let wallet = null;
let contract = null;

function getContract() {
  if (!contract) {
    const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
    if (!rpcUrl) throw new Error("BSC RPC URL not configured");

    provider = new ethers.JsonRpcProvider(rpcUrl);
    wallet = new ethers.Wallet(process.env.SETTLER_PRIVATE_KEY, provider);
    contract = new ethers.Contract(
      process.env.VIDEO_CONTRACT_ADDRESS,
      VIDEO_INTERACTION_ABI,
      wallet
    );
  }
  return contract;
}

/**
 * Attempt to settle the current round if it's settleable
 */
async function trySettle() {
  try {
    const videoContract = getContract();
    const settleable = await videoContract.isRoundSettleable();

    if (!settleable) {
      const remaining = await videoContract.timeUntilRoundEnd();
      logger.debug(`Round not settleable yet. Time remaining: ${remaining}s`);
      return;
    }

    const roundId = await videoContract.currentRoundId();
    logger.info(`Attempting to settle round ${roundId}...`);

    const tx = await videoContract.settleRound();
    const receipt = await tx.wait();

    logger.info(`Round ${roundId} settled successfully. TX: ${receipt.hash}`);
  } catch (error) {
    if (error.message?.includes("round not ended")) {
      logger.debug("Round not ended yet, skipping");
    } else if (error.message?.includes("already settled")) {
      logger.debug("Round already settled by another caller");
    } else {
      logger.error("Settle round failed:", error);
    }
  }
}

/**
 * Initialize the settler cron job
 * Runs every 5 minutes to check if a round needs settling
 */
function initSettlerCron() {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    logger.debug("Settler cron: checking if round needs settling...");
    await trySettle();
  });

  // Also try immediately on startup
  setTimeout(() => trySettle(), 5000);

  logger.info("Settler cron job scheduled (every 5 minutes)");
}

module.exports = { initSettlerCron, trySettle };
