const express = require("express");
const { ethers } = require("ethers");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/", async (req, res) => {
  const status = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
  };

  // Check BSC RPC connectivity
  try {
    const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
    if (rpcUrl) {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const blockNumber = await provider.getBlockNumber();
      status.services.bscRpc = { status: "ok", blockNumber };
    } else {
      status.services.bscRpc = { status: "not_configured" };
    }
  } catch (error) {
    status.services.bscRpc = { status: "error", message: error.message };
  }

  // Check Pinata connectivity
  status.services.pinata = {
    status: process.env.PINATA_JWT ? "configured" : "not_configured",
  };

  // Check settler configuration
  status.services.settler = {
    status: process.env.SETTLER_PRIVATE_KEY && process.env.VIDEO_CONTRACT_ADDRESS
      ? "configured"
      : "not_configured",
  };

  res.json(status);
});

module.exports = router;
