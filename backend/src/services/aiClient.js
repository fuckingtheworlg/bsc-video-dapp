const logger = require("../utils/logger");

// Image generation via yunjintao (gemini)
const AI_API_BASE_URL = process.env.AI_API_BASE_URL || "https://api.yunjintao.com";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_IMAGE_MODEL = process.env.AI_IMAGE_MODEL || "gemini-3-pro-image-preview";

// Video generation via Volcengine Seedance
const VOLC_API_BASE = process.env.VOLCENGINE_API_BASE || "https://ark.cn-beijing.volces.com/api/v3";
const VOLC_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const VOLC_VIDEO_MODEL = process.env.VOLCENGINE_VIDEO_MODEL || "doubao-seedance-1-5-pro-251215";

/**
 * Generate image via /v1/chat/completions (multimodal model like gemini)
 * The model returns an image as part of the chat response.
 * @param {string} prompt - Text prompt for image generation
 * @returns {Promise<{imageUrl: string}>}
 */
async function generateImage(prompt) {
  const url = `${AI_API_BASE_URL}/v1/chat/completions`;

  const body = {
    model: AI_IMAGE_MODEL,
    messages: [
      {
        role: "user",
        content: `请根据以下描述生成一张图片：${prompt}`,
      },
    ],
  };

  logger.info(`[AI] generateImage request: model=${AI_IMAGE_MODEL}, prompt="${prompt.slice(0, 80)}..."`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error(`[AI] generateImage failed: ${res.status} ${errText}`);
    throw new Error(`AI 文生图请求失败 (${res.status}): ${errText}`);
  }

  const data = await res.json();

  // Extract image from response - multimodal models may return image in different formats
  // 1. Check for base64 image in content parts
  // 2. Check for URL in content
  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error("AI 返回结果为空");
  }

  const message = choice.message;
  let imageUrl = null;

  // Case 1: content is an array of parts (multimodal response)
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part.type === "image_url") {
        imageUrl = part.image_url?.url;
        break;
      }
      if (part.type === "image" && part.image?.url) {
        imageUrl = part.image.url;
        break;
      }
    }
  }

  // Case 2: content is a string containing a data URI or URL
  if (!imageUrl && typeof message?.content === "string") {
    const content = message.content;
    // Check for data URI
    const dataUriMatch = content.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/);
    if (dataUriMatch) {
      imageUrl = dataUriMatch[1];
    }
    // Check for image URL
    if (!imageUrl) {
      const urlMatch = content.match(/(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp)[^\s"'<>]*)/i);
      if (urlMatch) {
        imageUrl = urlMatch[1];
      }
    }
  }

  // Case 3: check for image in data field (some providers)
  if (!imageUrl && data.data?.[0]?.url) {
    imageUrl = data.data[0].url;
  }
  if (!imageUrl && data.data?.[0]?.b64_json) {
    imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
  }

  if (!imageUrl) {
    logger.warn("[AI] Could not extract image from response:", JSON.stringify(data).slice(0, 500));
    throw new Error("无法从 AI 响应中提取图片");
  }

  logger.info(`[AI] generateImage success, imageUrl length: ${imageUrl.length}`);
  return { imageUrl };
}

/**
 * Submit text-to-video task via Volcengine Seedance API
 * @param {string} prompt - Text prompt for video generation
 * @param {number} duration - Duration in seconds (4-12)
 * @param {object} options - Optional: { generateAudio, ratio, resolution }
 * @returns {Promise<{taskId: string}>}
 */
async function submitVideoTask(prompt, duration = 5, options = {}) {
  const url = `${VOLC_API_BASE}/contents/generations/tasks`;

  const body = {
    model: VOLC_VIDEO_MODEL,
    content: [
      { type: "text", text: prompt },
    ],
    resolution: options.resolution || "720p",
    ratio: options.ratio || "16:9",
    duration: Number(duration),
  };

  // Seedance 1.5 pro supports audio generation
  if (options.generateAudio !== undefined) {
    body.generate_audio = options.generateAudio;
  }

  logger.info(`[Seedance] submitVideoTask: model=${VOLC_VIDEO_MODEL}, duration=${duration}s, prompt="${prompt.slice(0, 80)}..."`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOLC_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error(`[Seedance] submitVideoTask failed: ${res.status} ${errText}`);
    throw new Error(`视频生成请求失败 (${res.status}): ${errText}`);
  }

  const data = await res.json();

  const taskId = data.id;
  if (!taskId) {
    logger.warn("[Seedance] No task ID in response:", JSON.stringify(data).slice(0, 500));
    throw new Error("未能获取视频生成任务 ID");
  }

  logger.info(`[Seedance] submitVideoTask success, taskId: ${taskId}`);
  return { taskId };
}

/**
 * Submit image-to-video task via Volcengine Seedance API (first_frame mode)
 * @param {string} imageUrl - URL or base64 data URI of the source image
 * @param {string} prompt - Optional text prompt to guide the video
 * @param {number} duration - Duration in seconds (4-12)
 * @param {object} options - Optional: { generateAudio, ratio, resolution }
 * @returns {Promise<{taskId: string}>}
 */
async function submitImageToVideoTask(imageUrl, prompt = "", duration = 5, options = {}) {
  const url = `${VOLC_API_BASE}/contents/generations/tasks`;

  const content = [];

  // Add text prompt if provided
  if (prompt) {
    content.push({ type: "text", text: prompt });
  }

  // Add image as first_frame
  content.push({
    type: "image_url",
    image_url: { url: imageUrl },
    role: "first_frame",
  });

  const body = {
    model: VOLC_VIDEO_MODEL,
    content,
    resolution: options.resolution || "720p",
    duration: Number(duration),
  };

  // Seedance 1.5 pro supports audio generation
  if (options.generateAudio !== undefined) {
    body.generate_audio = options.generateAudio;
  }

  logger.info(`[Seedance] submitImageToVideoTask: model=${VOLC_VIDEO_MODEL}, duration=${duration}s, prompt="${(prompt || "").slice(0, 80)}"`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOLC_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error(`[Seedance] submitImageToVideoTask failed: ${res.status} ${errText}`);
    throw new Error(`图生视频请求失败 (${res.status}): ${errText}`);
  }

  const data = await res.json();

  const taskId = data.id;
  if (!taskId) {
    logger.warn("[Seedance] No task ID in img2video response:", JSON.stringify(data).slice(0, 500));
    throw new Error("未能获取图生视频任务 ID");
  }

  logger.info(`[Seedance] submitImageToVideoTask success, taskId: ${taskId}`);
  return { taskId };
}

/**
 * Check video generation task status via Volcengine Seedance API
 * Volcengine statuses: queued, running, succeeded, failed, expired
 * @param {string} taskId - Task ID from submitVideoTask
 * @returns {Promise<{status: string, videoUrl?: string, progress?: number}>}
 */
async function getVideoTaskStatus(taskId) {
  const url = `${VOLC_API_BASE}/contents/generations/tasks/${taskId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${VOLC_API_KEY}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error(`[Seedance] getVideoTaskStatus failed: ${res.status} ${errText}`);
    throw new Error(`查询视频任务状态失败 (${res.status})`);
  }

  const data = await res.json();

  // Volcengine status mapping: queued, running, succeeded, failed, expired
  const rawStatus = (data.status || "unknown").toLowerCase();
  let status = "pending";
  if (rawStatus === "succeeded") {
    status = "completed";
  } else if (rawStatus === "failed" || rawStatus === "expired") {
    status = "failed";
  } else if (rawStatus === "running") {
    status = "processing";
  } else if (rawStatus === "queued") {
    status = "pending";
  }

  // Extract video URL from content array if succeeded
  let videoUrl = null;
  if (status === "completed" && Array.isArray(data.content)) {
    for (const item of data.content) {
      if (item.type === "video_url" && item.video_url?.url) {
        videoUrl = item.video_url.url;
        break;
      }
    }
  }
  // Fallback: check video_url at top level
  if (!videoUrl && status === "completed") {
    videoUrl = data.video_url?.url || data.video?.url || null;
  }

  logger.info(`[Seedance] taskStatus: id=${taskId}, status=${rawStatus}, hasVideo=${!!videoUrl}`);

  return {
    status,
    videoUrl,
    progress: data.progress || 0,
    raw: data,
  };
}

module.exports = { generateImage, submitVideoTask, submitImageToVideoTask, getVideoTaskStatus };
