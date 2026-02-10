const { PinataSDK } = require("pinata-web3");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

let pinata = null;

function getPinata() {
  if (!pinata) {
    if (!process.env.PINATA_JWT) {
      throw new Error("PINATA_JWT environment variable is required");
    }
    pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT,
      pinataGateway: process.env.PINATA_GATEWAY || "",
    });
  }
  return pinata;
}

/**
 * Upload a file to Pinata IPFS
 * @param {string} filePath - Local file path
 * @param {string} fileName - Original file name
 * @param {object} metadata - Optional metadata key-value pairs
 * @returns {Promise<{cid: string, size: number}>}
 */
async function uploadFile(filePath, fileName, metadata = {}) {
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
