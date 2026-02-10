const logger = require("../utils/logger");

const AI_API_BASE_URL = process.env.AI_API_BASE_URL || "https://api.yunjintao.com";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_IMAGE_MODEL = process.env.AI_IMAGE_MODEL || "gemini-3-pro-image-preview";
const AI_VIDEO_MODEL = process.env.AI_VIDEO_MODEL || "sora-2";

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
 * Submit video generation task via /v1/videos
 * @param {string} prompt - Text prompt for video generation
 * @param {string} duration - Duration: "4", "8", or "12" seconds
 * @returns {Promise<{taskId: string}>}
 */
async function submitVideoTask(prompt, duration = "4") {
  const url = `${AI_API_BASE_URL}/v1/videos`;

  const body = {
    model: AI_VIDEO_MODEL,
    prompt: prompt,
    duration: duration,
  };

  logger.info(`[AI] submitVideoTask: model=${AI_VIDEO_MODEL}, duration=${duration}s, prompt="${prompt.slice(0, 80)}..."`);

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
    logger.error(`[AI] submitVideoTask failed: ${res.status} ${errText}`);
    throw new Error(`AI 文生视频请求失败 (${res.status}): ${errText}`);
  }

  const data = await res.json();

  // Extract task ID from response
  const taskId = data.id || data.task_id || data.data?.id;
  if (!taskId) {
    logger.warn("[AI] No task ID in video response:", JSON.stringify(data).slice(0, 500));
    throw new Error("未能获取视频生成任务 ID");
  }

  logger.info(`[AI] submitVideoTask success, taskId: ${taskId}`);
  return { taskId };
}

/**
 * Check video generation task status
 * @param {string} taskId - Task ID from submitVideoTask
 * @returns {Promise<{status: string, videoUrl?: string, progress?: number}>}
 */
async function getVideoTaskStatus(taskId) {
  const url = `${AI_API_BASE_URL}/v1/videos/${taskId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error(`[AI] getVideoTaskStatus failed: ${res.status} ${errText}`);
    throw new Error(`查询视频任务状态失败 (${res.status})`);
  }

  const data = await res.json();

  // Normalize status
  const rawStatus = data.status || data.state || "unknown";
  let status = "pending";
  if (["completed", "succeeded", "success", "done"].includes(rawStatus.toLowerCase())) {
    status = "completed";
  } else if (["failed", "error"].includes(rawStatus.toLowerCase())) {
    status = "failed";
  } else if (["processing", "running", "in_progress"].includes(rawStatus.toLowerCase())) {
    status = "processing";
  }

  // Extract video URL if completed
  let videoUrl = null;
  if (status === "completed") {
    videoUrl =
      data.video?.url ||
      data.output?.url ||
      data.result?.url ||
      data.data?.url ||
      (Array.isArray(data.data) && data.data[0]?.url) ||
      null;
  }

  return {
    status,
    videoUrl,
    progress: data.progress || data.percent || 0,
    raw: data,
  };
}

module.exports = { generateImage, submitVideoTask, getVideoTaskStatus };
