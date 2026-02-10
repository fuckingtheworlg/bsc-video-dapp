const { ethers } = require("ethers");
const logger = require("../utils/logger");

// In-memory nonce set to prevent signature replay attacks
// Stores used signatures with their expiry timestamps
const usedSignatures = new Map();
const SIGNATURE_MAX_AGE = 5 * 60; // 5 minutes in seconds

// Periodically clean expired signatures (every 10 minutes)
const cleanupInterval = setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [sig, expiry] of usedSignatures) {
    if (now > expiry) {
      usedSignatures.delete(sig);
    }
  }
}, 10 * 60 * 1000);

// Allow tests to clear the interval
function clearCleanupInterval() {
  clearInterval(cleanupInterval);
}

/**
 * Middleware to verify wallet signature.
 * Frontend signs a message with the user's wallet, backend verifies.
 * Headers required: X-Wallet-Address, X-Signature, X-Message
 */
function verifySignature(req, res, next) {
  try {
    const walletAddress = req.headers["x-wallet-address"];
    const signature = req.headers["x-signature"];
    const message = req.headers["x-message"];

    if (!walletAddress || !signature || !message) {
      return res.status(401).json({ error: "Missing authentication headers" });
    }

    // Check if signature has already been used (replay prevention)
    if (usedSignatures.has(signature)) {
      return res.status(401).json({ error: "Signature already used" });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Check message freshness (prevent replay attacks)
    // Message format: "BSC-DApp-Auth:{timestamp}"
    const parts = message.split(":");
    if (parts.length < 2) {
      return res.status(401).json({ error: "Invalid message format" });
    }
    const timestamp = parseInt(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(timestamp) || Math.abs(now - timestamp) > SIGNATURE_MAX_AGE) {
      return res.status(401).json({ error: "Signature expired" });
    }

    // Mark signature as used (expires when the message timestamp would expire)
    usedSignatures.set(signature, timestamp + SIGNATURE_MAX_AGE);

    req.walletAddress = ethers.getAddress(walletAddress); // checksummed
    next();
  } catch (error) {
    logger.error("Auth verification failed:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

module.exports = { verifySignature, clearCleanupInterval };
