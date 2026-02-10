const { PinataSDK } = require("pinata-web3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("../utils/logger");

let pinata = null;

// Local storage directory for dev/testing without Pinata
const LOCAL_STORAGE_DIR = path.join(__dirname, "../../uploads");

function isLocalMode() {
  const jwt = process.env.PINATA_JWT || "";
  return !jwt || jwt === "your_pinata_jwt_here" || jwt.length < 20;
}

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
}

function getPinata() {
  if (!pinata) {
    if (isLocalMode()) {
      throw new Error("Pinata not configured - using local mode");
    }
    pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT,
      pinataGateway: process.env.PINATA_GATEWAY || "",
    });
  }
  return pinata;
}

/**
 * Upload a file to Pinata IPFS (or local storage in dev mode)
 * @param {string} filePath - Local file path
 * @param {string} fileName - Original file name
 * @param {object} metadata - Optional metadata key-value pairs
 * @returns {Promise<{cid: string, size: number}>}
 */
async function uploadFile(filePath, fileName, metadata = {}) {
  // Local storage fallback for development
  if (isLocalMode()) {
    return uploadFileLocal(filePath, fileName);
  }

  try {
    const sdk = getPinata();
    const stat = fs.statSync(filePath);
    const readStream = fs.createReadStream(filePath);

    // Collect chunks for File construction (Pinata SDK requires File/Blob)
    const chunks = [];
    for await (const chunk of readStream) {
      chunks.push(chunk);
    }
    const blob = new Blob(chunks, { type: getContentType(fileName) });
    const file = new File([blob], fileName, {
      type: getContentType(fileName),
    });

    const result = await sdk.upload.file(file).addMetadata({
      name: fileName,
      keyValues: metadata,
    });

    logger.info(`File uploaded to IPFS: ${result.IpfsHash}`, { fileName, size: stat.size });

    return {
      cid: result.IpfsHash,
      size: stat.size,
    };
  } catch (error) {
    logger.error("Pinata upload failed:", error);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * Local file storage fallback (dev/testing only)
 */
async function uploadFileLocal(filePath, fileName) {
  ensureLocalDir();
  const stat = fs.statSync(filePath);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").slice(0, 32);
  const ext = path.extname(fileName);
  const localName = `${hash}${ext}`;
  const destPath = path.join(LOCAL_STORAGE_DIR, localName);
  fs.copyFileSync(filePath, destPath);
  logger.info(`[LOCAL MODE] File saved locally as ${localName}`, { fileName, size: stat.size });
  return { cid: localName, size: stat.size };
}

/**
 * Get content type from file extension
 */
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const types = {
    ".mp4": "video/mp4",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return types[ext] || "application/octet-stream";
}

/**
 * Get IPFS gateway URL for a CID
 */
function getGatewayUrl(cid) {
  const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
  return `https://${gateway}/ipfs/${cid}`;
}

module.exports = { uploadFile, getGatewayUrl };
