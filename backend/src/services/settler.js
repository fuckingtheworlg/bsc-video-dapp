const cron = require("node-cron");
const { ethers } = require("ethers");
const logger = require("../utils/logger");

const VIDEO_INTERACTION_ABI = [
  "function isRoundSettleable() view returns (bool)",
  "function settleRound() external",
  "function currentRoundId() view returns (uint256)",
  "function timeUntilRoundEnd() view returns (uint256)",
  "function getRound(uint256 roundId) view returns (tuple(uint256 startTime, uint256 endTime, bool settled, bytes32 merkleRoot, uint256 rewardPool, uint256 totalClaimed, uint256 participantCount, address[3] topVideos, uint256[3] topLikes))",
];

// BNB reward distribution config
const BNB_REWARD_PERCENT = parseInt(process.env.BNB_REWARD_PERCENT || "100"); // % of available BNB as the pool base
const BNB_REWARD_SPLIT = [25, 15, 10]; // Top 1/2/3 fixed split (total 50%, rest stays in wallet)
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MIN_BNB_RESERVE = ethers.parseEther("0.01"); // Keep minimum for gas fees

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

    // Distribute BNB rewards to top creators
    await distributeBnbRewards(roundId);
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
 * Distribute BNB from the settler wallet to top creators of a settled round
 * @param {bigint} roundId - The round that was just settled
 */
async function distributeBnbRewards(roundId) {
  try {
    const videoContract = getContract();

    // Read settled round data to get winners
    const round = await videoContract.getRound(roundId);
    const topVideos = round.topVideos;  // address[3]
    const topLikes = round.topLikes;    // uint256[3]

    // Filter out zero-address winners (fewer than 3 participants)
    const winners = [];
    for (let i = 0; i < 3; i++) {
      if (topVideos[i] !== ZERO_ADDRESS && topLikes[i] > 0n) {
        winners.push({ address: topVideos[i], rank: i });
      }
    }

    if (winners.length === 0) {
      logger.info(`Round ${roundId}: No winners to distribute BNB to`);
      return;
    }

    // Check wallet BNB balance
    const balance = await provider.getBalance(wallet.address);
    const available = balance - MIN_BNB_RESERVE;

    if (available <= 0n) {
      logger.warn(`Round ${roundId}: Insufficient BNB for rewards (balance: ${ethers.formatEther(balance)} BNB)`);
      return;
    }

    // Calculate total BNB to distribute this round
    const totalReward = available * BigInt(BNB_REWARD_PERCENT) / 100n;

    if (totalReward <= 0n) {
      logger.info(`Round ${roundId}: No BNB to distribute`);
      return;
    }

    logger.info(`Round ${roundId}: Distributing BNB to ${winners.length} winner(s), total pool: ${ethers.formatEther(totalReward)} BNB`);

    // Fixed split: 25/15/10 — positions without winners are skipped (BNB stays in wallet)
    for (let i = 0; i < winners.length; i++) {
      const amount = totalReward * BigInt(BNB_REWARD_SPLIT[winners[i].rank]) / 100n;
      if (amount <= 0n) continue;

      try {
        const tx = await wallet.sendTransaction({
          to: winners[i].address,
          value: amount,
        });
        await tx.wait();
        logger.info(`  #${winners[i].rank + 1} ${winners[i].address}: ${ethers.formatEther(amount)} BNB (TX: ${tx.hash})`);
      } catch (sendError) {
        logger.error(`  Failed to send BNB to ${winners[i].address}:`, sendError.message);
      }
    }

    logger.info(`Round ${roundId}: BNB reward distribution complete`);
  } catch (error) {
    logger.error(`Round ${roundId}: BNB distribution failed:`, error.message);
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
