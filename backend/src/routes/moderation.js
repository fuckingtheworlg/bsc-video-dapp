const express = require("express");
const fs = require("fs");
const path = require("path");
const { verifySignature } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

const BLOCKLIST_FILE = path.join(__dirname, "../../data/blocklist.json");
const REPORTS_FILE = path.join(__dirname, "../../data/reports.json");
const REPORT_THRESHOLD = 10; // Auto-block after this many reports

// Simple async mutex to prevent race conditions on file I/O
let fileLock = Promise.resolve();
function withFileLock(fn) {
  const prev = fileLock;
  let release;
  fileLock = new Promise((resolve) => { release = resolve; });
  return prev.then(() => fn()).finally(release);
}

// Ensure data directory exists
const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load JSON file or return default
 */
function loadJson(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (err) {
    logger.error(`Failed to load ${filePath}:`, err);
  }
  return defaultValue;
}

/**
 * Save JSON file
 */
function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * GET /api/moderation/blocklist
 * Returns list of blocked video CIDs (public, no auth required)
 */
router.get("/blocklist", (req, res) => {
  const blocklist = loadJson(BLOCKLIST_FILE, []);
  res.json({ blocklist });
});

/**
 * POST /api/moderation/report
 * Report a video by CID. Requires wallet signature.
 * Body: { cid: string, reason?: string }
 */
router.post("/report", verifySignature, async (req, res) => {
  const { cid, reason } = req.body;
  if (!cid || typeof cid !== "string") {
    return res.status(400).json({ error: "CID is required" });
  }

  await withFileLock(() => {
    try {
      const reports = loadJson(REPORTS_FILE, {});

      // Initialize report entry for this CID
      if (!reports[cid]) {
        reports[cid] = { reporters: [], reasons: [], count: 0, blocked: false };
      }

      // Check if user already reported this CID
      if (reports[cid].reporters.includes(req.walletAddress)) {
        return res.status(400).json({ error: "You have already reported this video" });
      }

      // Add report
      reports[cid].reporters.push(req.walletAddress);
      reports[cid].reasons.push(reason || "No reason provided");
      reports[cid].count += 1;

      logger.info(`Video reported: ${cid} by ${req.walletAddress} (total: ${reports[cid].count})`);

      // Auto-block if threshold reached
      if (reports[cid].count >= REPORT_THRESHOLD && !reports[cid].blocked) {
        reports[cid].blocked = true;

        const blocklist = loadJson(BLOCKLIST_FILE, []);
        if (!blocklist.includes(cid)) {
          blocklist.push(cid);
          saveJson(BLOCKLIST_FILE, blocklist);
          logger.warn(`Video auto-blocked: ${cid} (${reports[cid].count} reports)`);
        }
      }

      saveJson(REPORTS_FILE, reports);

      res.json({
        success: true,
        reportCount: reports[cid].count,
        autoBlocked: reports[cid].blocked,
      });
    } catch (error) {
      logger.error("Report submission failed:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });
});

/**
 * POST /api/moderation/block
 * Admin manually block/unblock a video CID
 * Body: { cid: string, block: boolean }
 * Note: In production, this should be restricted to admin wallet addresses
 */
router.post("/block", verifySignature, (req, res) => {
  try {
    const { cid, block } = req.body;
    if (!cid || typeof cid !== "string") {
      return res.status(400).json({ error: "CID is required" });
    }

    // Admin wallet access control
    const adminWallets = (process.env.ADMIN_WALLETS || "").split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
    if (adminWallets.length === 0) {
      return res.status(503).json({ error: "Admin wallets not configured" });
    }
    if (!adminWallets.includes(req.walletAddress.toLowerCase())) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const blocklist = loadJson(BLOCKLIST_FILE, []);

    if (block) {
      if (!blocklist.includes(cid)) {
        blocklist.push(cid);
        logger.info(`Video manually blocked: ${cid} by ${req.walletAddress}`);
      }
    } else {
      const idx = blocklist.indexOf(cid);
      if (idx !== -1) {
        blocklist.splice(idx, 1);
        logger.info(`Video manually unblocked: ${cid} by ${req.walletAddress}`);
      }
    }

    saveJson(BLOCKLIST_FILE, blocklist);
    res.json({ success: true, blocked: block });
  } catch (error) {
    logger.error("Block operation failed:", error);
    res.status(500).json({ error: "Block operation failed" });
  }
});

module.exports = router;
