const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { verifySignature } = require("../middleware/auth");
const { uploadFile } = require("../services/pinata");
const { cleanupTempFile, TEMP_DIR } = require("../services/ffmpeg");
const logger = require("../utils/logger");

const router = express.Router();

// Multer configuration for video uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `video_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "video/mp4") {
      return cb(new Error("Only MP4 files are allowed"), false);
    }
    cb(null, true);
  },
});

// Multer configuration for cover image uploads
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `cover_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const coverUpload = multer({
  storage: coverStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG/PNG images are allowed"), false);
    }
    cb(null, true);
  },
});

/**
 * POST /api/upload/video
 * Upload video to Pinata IPFS, return CID
 * Requires wallet signature authentication
 */
router.post("/video", verifySignature, videoUpload.single("video"), async (req, res) => {
  let tempPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    tempPath = req.file.path;
    logger.info(`Video upload started by ${req.walletAddress}, file: ${req.file.originalname}, size: ${req.file.size}`);

    const result = await uploadFile(tempPath, req.file.originalname, {
      uploader: req.walletAddress,
      type: "video",
    });

    res.json({
      success: true,
      cid: result.cid,
      size: result.size,
      fileName: req.file.originalname,
    });
  } catch (error) {
    logger.error("Video upload failed:", error);
    res.status(500).json({ error: error.message || "Video upload failed" });
  } finally {
    if (tempPath) cleanupTempFile(tempPath);
  }
});

/**
 * POST /api/upload/cover
 * Upload cover image to Pinata IPFS, return CID
 * Requires wallet signature authentication
 */
router.post("/cover", verifySignature, coverUpload.single("cover"), async (req, res) => {
  let tempPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No cover image provided" });
    }

    tempPath = req.file.path;
    logger.info(`Cover upload started by ${req.walletAddress}, file: ${req.file.originalname}`);

    const result = await uploadFile(tempPath, req.file.originalname, {
      uploader: req.walletAddress,
      type: "cover",
    });

    res.json({
      success: true,
      cid: result.cid,
      size: result.size,
      fileName: req.file.originalname,
    });
  } catch (error) {
    logger.error("Cover upload failed:", error);
    res.status(500).json({ error: error.message || "Cover upload failed" });
  } finally {
    if (tempPath) cleanupTempFile(tempPath);
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large" });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message === "Only MP4 files are allowed" || err.message === "Only JPG/PNG images are allowed") {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
