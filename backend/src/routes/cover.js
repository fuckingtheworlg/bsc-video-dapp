const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { verifySignature } = require("../middleware/auth");
const { extractCover, cleanupTempFile, TEMP_DIR } = require("../services/ffmpeg");
const { uploadFile } = require("../services/pinata");
const logger = require("../utils/logger");

const router = express.Router();

const videoForCover = multer({
  dest: TEMP_DIR,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "video/mp4") {
      return cb(new Error("Only MP4 files are allowed"), false);
    }
    cb(null, true);
  },
});

/**
 * POST /api/cover/generate
 * Upload a video, extract first frame as cover, upload cover to IPFS
 * Returns the cover CID
 */
router.post("/generate", verifySignature, videoForCover.single("video"), async (req, res) => {
  let videoPath = null;
  let coverPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    videoPath = req.file.path;
    logger.info(`Cover generation started by ${req.walletAddress}`);

    // Extract first frame
    coverPath = await extractCover(videoPath);

    // Upload cover to IPFS
    const result = await uploadFile(coverPath, `cover_${Date.now()}.jpg`, {
      uploader: req.walletAddress,
      type: "auto-cover",
    });

    res.json({
      success: true,
      cid: result.cid,
      size: result.size,
    });
  } catch (error) {
    logger.error("Cover generation failed:", error);
    res.status(500).json({ error: error.message || "Cover generation failed" });
  } finally {
    if (videoPath) cleanupTempFile(videoPath);
    if (coverPath) cleanupTempFile(coverPath);
  }
});

module.exports = router;
