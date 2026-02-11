const express = require("express");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const logger = require("../utils/logger");

const router = express.Router();

const DATA_DIR = path.join(__dirname, "../../data");
const PERMITS_FILE = path.join(DATA_DIR, "permits.json");
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD".toLowerCase();
const BURN_AMOUNT = ethers.parseEther("50000");

// ERC20 Transfer event signature
const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadPermits() {
  try {
    if (fs.existsSync(PERMITS_FILE)) {
      return JSON.parse(fs.readFileSync(PERMITS_FILE, "utf-8"));
    }
  } catch (e) {
    logger.error("[Permit] Failed to load permits:", e.message);
  }
  return {};
}

function savePermits(permits) {
  fs.writeFileSync(PERMITS_FILE, JSON.stringify(permits, null, 2));
}

/**
 * GET /api/permit/count?wallet=0x...
 * Returns the number of unused burn permits for a wallet
 */
router.get("/count", (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) {
    return res.status(400).json({ error: "Missing wallet parameter" });
  }

  const permits = loadPermits();
  const key = wallet.toLowerCase();
  const record = permits[key] || { permits: 0, usedTxHashes: [] };

  res.json({ permits: record.permits });
});

/**
 * POST /api/permit/register
 * Body: { wallet: string, txHash: string }
 * Verifies a burn transaction and grants an upload permit
 */
router.post("/register", async (req, res) => {
  try {
    const { wallet, txHash } = req.body;
    if (!wallet || !txHash) {
      return res.status(400).json({ error: "Missing wallet or txHash" });
    }

    const key = wallet.toLowerCase();
    const permits = loadPermits();
    const record = permits[key] || { permits: 0, usedTxHashes: [] };

    // Check if this tx was already registered
    if (record.usedTxHashes.includes(txHash.toLowerCase())) {
      return res.json({ permits: record.permits, message: "Already registered" });
    }

    // Verify the transaction on-chain
    const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
    if (!rpcUrl) {
      return res.status(500).json({ error: "RPC not configured" });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({ error: "Transaction failed or not found" });
    }

    // Verify: must be a Transfer event to dead address with >= 50,000 tokens
    const tokenAddress = (process.env.TOKEN_CONTRACT_ADDRESS || "").toLowerCase();
    let validBurn = false;

    for (const log of receipt.logs) {
      if (
        log.topics[0] === TRANSFER_TOPIC &&
        log.address.toLowerCase() === tokenAddress
      ) {
        // Decode from/to from indexed topics
        const from = "0x" + log.topics[1].slice(26);
        const to = "0x" + log.topics[2].slice(26);
        const amount = BigInt(log.data);

        if (
          from.toLowerCase() === key &&
          to.toLowerCase() === DEAD_ADDRESS &&
          amount >= BURN_AMOUNT
        ) {
          validBurn = true;
          break;
        }
      }
    }

    if (!validBurn) {
      return res.status(400).json({ error: "Not a valid burn transaction" });
    }

    // Grant permit
    record.permits += 1;
    record.usedTxHashes.push(txHash.toLowerCase());
    permits[key] = record;
    savePermits(permits);

    logger.info(`[Permit] Granted permit to ${wallet}. TX: ${txHash}. Total: ${record.permits}`);
    res.json({ permits: record.permits, message: "Permit granted" });
  } catch (error) {
    logger.error("[Permit] Register failed:", error.message);
    res.status(500).json({ error: "Failed to verify burn transaction" });
  }
});

/**
 * POST /api/permit/use
 * Body: { wallet: string }
 * Consumes one permit (called after successful video upload)
 */
router.post("/use", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) {
    return res.status(400).json({ error: "Missing wallet" });
  }

  const key = wallet.toLowerCase();
  const permits = loadPermits();
  const record = permits[key] || { permits: 0, usedTxHashes: [] };

  if (record.permits <= 0) {
    return res.status(403).json({ error: "No permits available" });
  }

  record.permits -= 1;
  permits[key] = record;
  savePermits(permits);

  logger.info(`[Permit] Used permit for ${wallet}. Remaining: ${record.permits}`);
  res.json({ permits: record.permits });
});

module.exports = router;
