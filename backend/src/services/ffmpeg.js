const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

const TEMP_DIR = path.join(__dirname, "../../temp");

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Extract first frame from video as cover image
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<string>} - Path to the generated cover image
 */
function extractCover(videoPath) {
  return new Promise((resolve, reject) => {
    const outputFileName = `cover_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const outputPath = path.join(TEMP_DIR, outputFileName);

    ffmpeg(videoPath)
      .on("end", () => {
        logger.info(`Cover extracted: ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        logger.error("FFmpeg cover extraction failed:", err);
        reject(new Error(`Cover extraction failed: ${err.message}`));
      })
      .screenshots({
        count: 1,
        folder: TEMP_DIR,
        filename: outputFileName,
        size: "640x360",
        timemarks: ["0.5"], // 0.5 seconds into the video
      });
  });
}

/**
 * Clean up temp file
 * @param {string} filePath - Path to delete
 */
function cleanupTempFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logger.warn(`Failed to cleanup temp file: ${filePath}`, err);
  }
}

module.exports = { extractCover, cleanupTempFile, TEMP_DIR };
