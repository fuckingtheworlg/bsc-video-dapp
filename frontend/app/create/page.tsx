"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useUSDT } from "@/hooks/useUSDT";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wand2,
  Image as ImageIcon,
  Video,
  Loader2,
  Download,
  Clock,
  Wallet,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Upload,
  Film,
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

type TabType = "image" | "video" | "img2video";
type VideoStatus = "idle" | "submitting" | "processing" | "completed" | "failed";

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { balance: usdtBalance, isEligible, isLoading: usdtLoading } = useUSDT();

  const [activeTab, setActiveTab] = useState<TabType>("image");
  const [prompt, setPrompt] = useState("");
  const [videoDuration, setVideoDuration] = useState("4");

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Video state
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);

  // Image-to-video state
  const [i2vImageData, setI2vImageData] = useState<string | null>(null);
  const [i2vPrompt, setI2vPrompt] = useState("");
  const [i2vDuration, setI2vDuration] = useState("4");
  const [i2vTaskId, setI2vTaskId] = useState<string | null>(null);
  const [i2vStatus, setI2vStatus] = useState<VideoStatus>("idle");
  const [i2vVideoUrl, setI2vVideoUrl] = useState<string | null>(null);
  const [i2vProgress, setI2vProgress] = useState(0);

  // Cooldown state
  const [cooldownSec, setCooldownSec] = useState(0);

  // Fetch cooldown on mount and after generation
  const fetchCooldown = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/cooldown?wallet=${address}`);
      const data = await res.json();
      if (data.cooldownRemaining > 0) {
        setCooldownSec(data.cooldownRemaining);
      }
    } catch {
      // ignore
    }
  }, [address]);

  useEffect(() => {
    fetchCooldown();
  }, [fetchCooldown]);

  // Countdown timer
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  // Poll video task status (shared for text2video and img2video)
  useEffect(() => {
    const taskId = videoTaskId || i2vTaskId;
    const status = videoTaskId ? videoStatus : i2vStatus;
    if (!taskId || status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/ai/video/status/${taskId}`);
        const data = await res.json();

        if (videoTaskId) {
          setVideoProgress(data.progress || 0);
          if (data.status === "completed" && data.videoUrl) {
            setVideoUrl(data.videoUrl);
            setVideoStatus("completed");
            toast.success("视频生成完成！");
            clearInterval(interval);
          } else if (data.status === "failed") {
            setVideoStatus("failed");
            toast.error("视频生成失败，请重试");
            clearInterval(interval);
          }
        } else {
          setI2vProgress(data.progress || 0);
          if (data.status === "completed" && data.videoUrl) {
            setI2vVideoUrl(data.videoUrl);
            setI2vStatus("completed");
            toast.success("图生视频完成！");
            clearInterval(interval);
          } else if (data.status === "failed") {
            setI2vStatus("failed");
            toast.error("图生视频失败，请重试");
            clearInterval(interval);
          }
        }
      } catch {
        // keep polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [videoTaskId, videoStatus, i2vTaskId, i2vStatus]);

  // Sign message helper
  const getAuthHeaders = async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `BSC-DApp-Auth:${timestamp}`;
    const signature = await signMessageAsync({ message });
    return {
      "X-Wallet-Address": address!,
      "X-Signature": signature,
      "X-Message": message,
      "Content-Type": "application/json",
    };
  };

  // Generate image
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.warning("请输入提示词");
      return;
    }
    try {
      setImageLoading(true);
      setImageUrl(null);
      toast.info("正在签名验证身份...");
      const headers = await getAuthHeaders();

      toast.info("正在生成图片，请稍候...");
      const res = await fetch(`${BACKEND_URL}/api/ai/image`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "COOLDOWN") {
          setCooldownSec(data.cooldownRemaining);
          toast.warning(data.error);
        } else if (data.code === "INSUFFICIENT_BALANCE") {
          toast.error(data.error);
        } else {
          toast.error(data.error || "图片生成失败");
        }
        return;
      }

      setImageUrl(data.imageUrl);
      setCooldownSec(data.cooldownRemaining || 600);
      toast.success("图片生成成功！");
    } catch (error: any) {
      toast.error("生成失败: " + (error.message || "未知错误"));
    } finally {
      setImageLoading(false);
    }
  };

  // Generate video
  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      toast.warning("请输入提示词");
      return;
    }
    try {
      setVideoStatus("submitting");
      setVideoUrl(null);
      setVideoProgress(0);
      toast.info("正在签名验证身份...");
      const headers = await getAuthHeaders();

      toast.info("正在提交视频生成任务...");
      const res = await fetch(`${BACKEND_URL}/api/ai/video`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: prompt.trim(), duration: videoDuration }),
      });

      const data = await res.json();
      if (!res.ok) {
        setVideoStatus("idle");
        if (data.code === "COOLDOWN") {
          setCooldownSec(data.cooldownRemaining);
          toast.warning(data.error);
        } else if (data.code === "INSUFFICIENT_BALANCE") {
          toast.error(data.error);
        } else {
          toast.error(data.error || "视频任务提交失败");
        }
        return;
      }

      setVideoTaskId(data.taskId);
      setVideoStatus("processing");
      setCooldownSec(data.cooldownRemaining || 600);
      toast.success("视频任务已提交，正在生成中...");
    } catch (error: any) {
      setVideoStatus("idle");
      toast.error("提交失败: " + (error.message || "未知错误"));
    }
  };

  // Handle image upload for img2video
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.warning("请选择图片文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.warning("图片大小不能超过 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setI2vImageData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Generate video from image
  const handleImg2Video = async () => {
    if (!i2vImageData) {
      toast.warning("请先上传图片");
      return;
    }
    try {
      setI2vStatus("submitting");
      setI2vVideoUrl(null);
      setI2vProgress(0);
      toast.info("正在签名验证身份...");
      const headers = await getAuthHeaders();

      toast.info("正在提交图生视频任务...");
      const res = await fetch(`${BACKEND_URL}/api/ai/img2video`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          imageUrl: i2vImageData,
          prompt: i2vPrompt.trim(),
          duration: i2vDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setI2vStatus("idle");
        if (data.code === "COOLDOWN") {
          setCooldownSec(data.cooldownRemaining);
          toast.warning(data.error);
        } else if (data.code === "INSUFFICIENT_BALANCE") {
          toast.error(data.error);
        } else {
          toast.error(data.error || "图生视频任务提交失败");
        }
        return;
      }

      setI2vTaskId(data.taskId);
      setI2vStatus("processing");
      setCooldownSec(data.cooldownRemaining || 600);
      toast.success("图生视频任务已提交，正在生成中...");
    } catch (error: any) {
      setI2vStatus("idle");
      toast.error("提交失败: " + (error.message || "未知错误"));
    }
  };

  const formatCooldown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="container flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6 p-12 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Wallet className="h-8 w-8 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">请先连接钱包</h2>
          <p className="text-zinc-400">连接钱包后即可使用 AI 创作功能</p>
        </div>
      </div>
    );
  }

  // USDT check
  const showUSDTWarning = !usdtLoading && !isEligible;

  return (
    <div className="container py-12 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <Wand2 className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI 创作
          </h1>
          <p className="text-sm text-zinc-500">输入提示词，AI 为你生成图片或视频</p>
        </div>
      </div>

      {/* USDT Warning */}
      {showUSDTWarning && (
        <div className="mb-6 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-300 font-medium">余额不足</p>
            <p className="text-yellow-400/70 text-sm">
              需要持有 ≥20 USDT 或等值 ≥20U 的 BNB 才能使用 AI 创作
            </p>
          </div>
        </div>
      )}

      {/* Cooldown Banner */}
      {cooldownSec > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-400 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-blue-300 font-medium">冷却中</p>
            <p className="text-blue-400/70 text-sm">
              距离下次可用还有 <span className="font-mono font-bold text-blue-300">{formatCooldown(cooldownSec)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={() => setActiveTab("image")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
            activeTab === "image"
              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          文生图
        </button>
        <button
          onClick={() => setActiveTab("video")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
            activeTab === "video"
              ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <Video className="h-4 w-4" />
          文生视频
        </button>
        <button
          onClick={() => setActiveTab("img2video")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
            activeTab === "img2video"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <Film className="h-4 w-4" />
          图生视频
        </button>
      </div>

      {/* Input Area - Text-to-Image / Text-to-Video */}
      {(activeTab === "image" || activeTab === "video") && (
        <div className="space-y-4 mb-8">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === "image"
                  ? "描述你想生成的图片，例如：一只在星空下奔跑的白色独角兽..."
                  : "描述你想生成的视频，例如：海浪拍打沙滩的慢镜头..."
              }
              className="w-full h-32 p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/20 transition-all"
              maxLength={2000}
            />
            <span className="absolute bottom-3 right-3 text-xs text-zinc-600">
              {prompt.length}/2000
            </span>
          </div>

          {activeTab === "video" && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">视频时长:</span>
              {["4", "8", "12"].map((d) => (
                <button
                  key={d}
                  onClick={() => setVideoDuration(d)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    videoDuration === d
                      ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                      : "text-zinc-400 hover:text-white bg-white/5 border border-white/5"
                  }`}
                >
                  {d}秒
                </button>
              ))}
            </div>
          )}

          <Button
            onClick={activeTab === "image" ? handleGenerateImage : handleGenerateVideo}
            disabled={
              imageLoading ||
              videoStatus === "submitting" ||
              videoStatus === "processing" ||
              cooldownSec > 0 ||
              showUSDTWarning ||
              !prompt.trim()
            }
            className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 font-medium text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {imageLoading || videoStatus === "submitting" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {activeTab === "image" ? "图片生成中..." : "任务提交中..."}
              </>
            ) : cooldownSec > 0 ? (
              <>
                <Clock className="h-5 w-5 mr-2" />
                冷却中 {formatCooldown(cooldownSec)}
              </>
            ) : showUSDTWarning ? (
              <>
                <AlertTriangle className="h-5 w-5 mr-2" />
                余额不足，无法使用
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                {activeTab === "image" ? "生成图片" : "生成视频"}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Input Area - Image-to-Video */}
      {activeTab === "img2video" && (
        <div className="space-y-4 mb-8">
          {/* Image Upload */}
          <div
            className={`relative rounded-2xl border-2 border-dashed transition-all ${
              i2vImageData
                ? "border-cyan-500/30 bg-cyan-500/5"
                : "border-white/10 bg-white/5 hover:border-cyan-500/20"
            } p-4`}
          >
            {i2vImageData ? (
              <div className="relative">
                <img
                  src={i2vImageData}
                  alt="上传的图片"
                  className="w-full max-h-64 object-contain rounded-xl"
                />
                <button
                  onClick={() => setI2vImageData(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-all text-xs"
                >
                  更换图片
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center py-10 cursor-pointer">
                <Upload className="h-10 w-10 text-zinc-500 mb-3" />
                <p className="text-zinc-400 text-sm">点击上传图片</p>
                <p className="text-zinc-600 text-xs mt-1">支持 JPG、PNG、WebP，最大 10MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Optional prompt */}
          <div className="relative">
            <textarea
              value={i2vPrompt}
              onChange={(e) => setI2vPrompt(e.target.value)}
              placeholder="可选：描述视频动作方向，例如：镜头缓慢推进，花朵绽放..."
              className="w-full h-20 p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              maxLength={2000}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">视频时长:</span>
            {["4", "8", "12"].map((d) => (
              <button
                key={d}
                onClick={() => setI2vDuration(d)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  i2vDuration === d
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "text-zinc-400 hover:text-white bg-white/5 border border-white/5"
                }`}
              >
                {d}秒
              </button>
            ))}
          </div>

          <Button
            onClick={handleImg2Video}
            disabled={
              i2vStatus === "submitting" ||
              i2vStatus === "processing" ||
              cooldownSec > 0 ||
              showUSDTWarning ||
              !i2vImageData
            }
            className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 font-medium text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {i2vStatus === "submitting" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                任务提交中...
              </>
            ) : cooldownSec > 0 ? (
              <>
                <Clock className="h-5 w-5 mr-2" />
                冷却中 {formatCooldown(cooldownSec)}
              </>
            ) : showUSDTWarning ? (
              <>
                <AlertTriangle className="h-5 w-5 mr-2" />
                余额不足，无法使用
              </>
            ) : (
              <>
                <Film className="h-5 w-5 mr-2" />
                图片生成视频
              </>
            )}
          </Button>
        </div>
      )}

      {/* Results Area */}
      {activeTab === "image" && (
        <div>
          {imageLoading && (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/5">
              <Loader2 className="h-12 w-12 text-purple-400 animate-spin mb-4" />
              <p className="text-zinc-400">AI 正在创作中，请稍候...</p>
            </div>
          )}

          {imageUrl && !imageLoading && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                <img
                  src={imageUrl}
                  alt="AI 生成图片"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex gap-3">
                <a
                  href={imageUrl}
                  download="ai-generated-image.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm"
                >
                  <Download className="h-4 w-4" />
                  下载图片
                </a>
                <Button
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => {
                    setImageUrl(null);
                    setPrompt("");
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新创作
                </Button>
              </div>
            </div>
          )}

          {!imageUrl && !imageLoading && (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <ImageIcon className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-500">输入提示词后点击生成，AI 图片将在这里展示</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "video" && (
        <div>
          {(videoStatus === "submitting" || videoStatus === "processing") && (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/5">
              <Loader2 className="h-12 w-12 text-pink-400 animate-spin mb-4" />
              <p className="text-zinc-300 font-medium mb-1">
                {videoStatus === "submitting" ? "正在提交任务..." : "视频生成中..."}
              </p>
              {videoStatus === "processing" && (
                <div className="w-48 mt-3">
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(videoProgress, 10)}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2 text-center">
                    {videoProgress > 0 ? `${videoProgress}%` : "请耐心等待，视频生成需要一些时间..."}
                  </p>
                </div>
              )}
            </div>
          )}

          {videoStatus === "completed" && videoUrl && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-black border border-white/5">
                <video controls className="w-full" src={videoUrl}>
                  您的浏览器不支持视频播放。
                </video>
              </div>
              <div className="flex gap-3">
                <a
                  href={videoUrl}
                  download="ai-generated-video.mp4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm"
                >
                  <Download className="h-4 w-4" />
                  下载视频
                </a>
                <Button
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => {
                    setVideoUrl(null);
                    setVideoTaskId(null);
                    setVideoStatus("idle");
                    setPrompt("");
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新创作
                </Button>
              </div>
            </div>
          )}

          {videoStatus === "failed" && (
            <div className="flex flex-col items-center justify-center py-20 bg-red-500/5 rounded-3xl border border-red-500/10">
              <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-red-300 font-medium mb-2">视频生成失败</p>
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white"
                onClick={() => {
                  setVideoStatus("idle");
                  setVideoTaskId(null);
                }}
              >
                重试
              </Button>
            </div>
          )}

          {videoStatus === "idle" && (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <Video className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-500">输入提示词后点击生成，AI 视频将在这里展示</p>
              <p className="text-xs text-zinc-600 mt-2">支持 4秒 / 8秒 / 12秒，720p 分辨率</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "img2video" && (
        <div>
          {(i2vStatus === "submitting" || i2vStatus === "processing") && (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/5">
              <Loader2 className="h-12 w-12 text-cyan-400 animate-spin mb-4" />
              <p className="text-zinc-300 font-medium mb-1">
                {i2vStatus === "submitting" ? "正在提交任务..." : "图生视频中..."}
              </p>
              {i2vStatus === "processing" && (
                <div className="w-48 mt-3">
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(i2vProgress, 10)}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2 text-center">
                    {i2vProgress > 0 ? `${i2vProgress}%` : "请耐心等待，视频生成需要一些时间..."}
                  </p>
                </div>
              )}
            </div>
          )}

          {i2vStatus === "completed" && i2vVideoUrl && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-black border border-white/5">
                <video controls className="w-full" src={i2vVideoUrl}>
                  您的浏览器不支持视频播放。
                </video>
              </div>
              <div className="flex gap-3">
                <a
                  href={i2vVideoUrl}
                  download="ai-img2video.mp4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm"
                >
                  <Download className="h-4 w-4" />
                  下载视频
                </a>
                <Button
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => {
                    setI2vVideoUrl(null);
                    setI2vTaskId(null);
                    setI2vStatus("idle");
                    setI2vImageData(null);
                    setI2vPrompt("");
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新创作
                </Button>
              </div>
            </div>
          )}

          {i2vStatus === "failed" && (
            <div className="flex flex-col items-center justify-center py-20 bg-red-500/5 rounded-3xl border border-red-500/10">
              <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-red-300 font-medium mb-2">图生视频失败</p>
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white"
                onClick={() => {
                  setI2vStatus("idle");
                  setI2vTaskId(null);
                }}
              >
                重试
              </Button>
            </div>
          )}

          {i2vStatus === "idle" && (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <Film className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-500">上传图片后点击生成，AI 将把图片转为视频</p>
              <p className="text-xs text-zinc-600 mt-2">支持 4秒 / 8秒 / 12秒，720p 分辨率</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
