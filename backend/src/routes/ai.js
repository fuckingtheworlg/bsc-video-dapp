const express = require("express");
const { verifySignature } = require("../middleware/auth");
const { generateImage, submitVideoTask, submitImageToVideoTask, getVideoTaskStatus } = require("../services/aiClient");
const { checkUSDTBalance } = require("../services/usdtCheck");
const logger = require("../utils/logger");

const router = express.Router();

// In-memory cooldown map: wallet -> last use timestamp (ms)
const cooldownMap = new Map();
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const SKIP_COOLDOWN = process.env.SKIP_COOLDOWN === "true";

/**
 * Check cooldown for a wallet
 * @returns {{ onCooldown: boolean, remainingMs: number }}
 */
function checkCooldown(wallet) {
  if (SKIP_COOLDOWN) return { onCooldown: false, remainingMs: 0 };
  const key = wallet.toLowerCase();
  const lastUse = cooldownMap.get(key);
  if (!lastUse) return { onCooldown: false, remainingMs: 0 };

  const elapsed = Date.now() - lastUse;
  if (elapsed >= COOLDOWN_MS) {
    cooldownMap.delete(key);
    return { onCooldown: false, remainingMs: 0 };
  }
  return { onCooldown: true, remainingMs: COOLDOWN_MS - elapsed };
}

/**
 * Set cooldown for a wallet (called after successful generation)
 */
function setCooldown(wallet) {
  if (SKIP_COOLDOWN) return;
  cooldownMap.set(wallet.toLowerCase(), Date.now());
}

/**
 * Middleware: check USDT balance >= 20 and cooldown
 */
async function checkEligibility(req, res, next) {
  try {
    const wallet = req.walletAddress;

    // Check USDT balance
    const { eligible, usdtBalance, bnbBalance, bnbValueUsd } = await checkUSDTBalance(wallet);
    if (!eligible) {
      return res.status(403).json({
        error: `余额不足：需要持有 ≥20 USDT 或等值 ≥20U 的 BNB。当前 USDT: ${usdtBalance}, BNB: ${bnbBalance} (≈$${bnbValueUsd})`,
        code: "INSUFFICIENT_BALANCE",
        usdtBalance,
        bnbBalance,
        bnbValueUsd,
      });
    }

    // Check cooldown
    const { onCooldown, remainingMs } = checkCooldown(wallet);
    if (onCooldown) {
      const remainingSec = Math.ceil(remainingMs / 1000);
      return res.status(429).json({
        error: `冷却中，请等待 ${Math.floor(remainingSec / 60)} 分 ${remainingSec % 60} 秒后再试`,
        code: "COOLDOWN",
        cooldownRemaining: remainingSec,
      });
    }

    next();
  } catch (error) {
    logger.error("[AI Route] Eligibility check failed:", error.message);
    res.status(500).json({ error: error.message || "资格检查失败" });
  }
}

/**
 * GET /api/ai/cooldown?wallet=0x...
 * Returns cooldown remaining seconds for a wallet
 */
router.get("/cooldown", (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) {
    return res.status(400).json({ error: "缺少 wallet 参数" });
  }
  const { onCooldown, remainingMs } = checkCooldown(wallet);
  res.json({
    onCooldown,
    cooldownRemaining: Math.ceil(remainingMs / 1000),
  });
});

/**
 * POST /api/ai/image
 * Body: { prompt: string }
 * Headers: X-Wallet-Address, X-Signature, X-Message
 */
router.post("/image", verifySignature, checkEligibility, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "请输入提示词" });
    }
    if (prompt.length > 2000) {
      return res.status(400).json({ error: "提示词过长，最多 2000 字" });
    }

    logger.info(`[AI Route] Image generation by ${req.walletAddress}: "${prompt.slice(0, 80)}..."`);

    const result = await generateImage(prompt.trim());

    // Set cooldown after successful generation
    setCooldown(req.walletAddress);

    res.json({
      success: true,
      imageUrl: result.imageUrl,
      cooldownRemaining: COOLDOWN_MS / 1000,
    });
  } catch (error) {
    logger.error("[AI Route] Image generation failed:", error.message);
    res.status(500).json({ error: error.message || "图片生成失败" });
  }
});

/**
 * POST /api/ai/video
 * Body: { prompt: string, duration?: 4-12, generateAudio?: boolean }
 * Headers: X-Wallet-Address, X-Signature, X-Message
 */
router.post("/video", verifySignature, checkEligibility, async (req, res) => {
  try {
    const { prompt, duration = 5, generateAudio } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "请输入提示词" });
    }
    if (prompt.length > 2000) {
      return res.status(400).json({ error: "提示词过长，最多 2000 字" });
    }
    const dur = Number(duration);
    if (!Number.isInteger(dur) || dur < 4 || dur > 12) {
      return res.status(400).json({ error: "时长参数无效，支持 4-12 秒整数" });
    }

    logger.info(`[AI Route] Video generation by ${req.walletAddress}: duration=${dur}s, "${prompt.slice(0, 80)}..."`);

    const result = await submitVideoTask(prompt.trim(), dur, { generateAudio });

    // Set cooldown after successful submission
    setCooldown(req.walletAddress);

    res.json({
      success: true,
      taskId: result.taskId,
      cooldownRemaining: COOLDOWN_MS / 1000,
    });
  } catch (error) {
    logger.error("[AI Route] Video generation failed:", error.message);
    res.status(500).json({ error: error.message || "视频生成失败" });
  }
});

/**
 * POST /api/ai/img2video
 * Body: { imageUrl: string, prompt?: string, duration?: 4-12, generateAudio?: boolean }
 * Headers: X-Wallet-Address, X-Signature, X-Message
 */
router.post("/img2video", verifySignature, checkEligibility, async (req, res) => {
  try {
    const { imageUrl, prompt = "", duration = 5, generateAudio } = req.body;
    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({ error: "请提供图片" });
    }
    if (prompt && prompt.length > 2000) {
      return res.status(400).json({ error: "提示词过长，最多 2000 字" });
    }
    const dur = Number(duration);
    if (!Number.isInteger(dur) || dur < 4 || dur > 12) {
      return res.status(400).json({ error: "时长参数无效，支持 4-12 秒整数" });
    }

    logger.info(`[AI Route] Img2Video by ${req.walletAddress}: duration=${dur}s`);

    const result = await submitImageToVideoTask(imageUrl, prompt.trim(), dur, { generateAudio });

    setCooldown(req.walletAddress);

    res.json({
      success: true,
      taskId: result.taskId,
      cooldownRemaining: COOLDOWN_MS / 1000,
    });
  } catch (error) {
    logger.error("[AI Route] Img2Video failed:", error.message);
    res.status(500).json({ error: error.message || "图生视频失败" });
  }
});

/**
 * GET /api/ai/video/status/:taskId
 * Query video generation task status
 */
router.get("/video/status/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ error: "缺少 taskId" });
    }

    const result = await getVideoTaskStatus(taskId);
    res.json(result);
  } catch (error) {
    logger.error("[AI Route] Video status check failed:", error.message);
    res.status(500).json({ error: error.message || "查询视频状态失败" });
  }
});

module.exports = router;
