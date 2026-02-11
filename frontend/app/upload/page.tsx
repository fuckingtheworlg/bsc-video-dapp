"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useRouter } from "next/navigation";
import { useToken } from "@/hooks/useToken";
import { useTokenSymbol } from "@/hooks/useTokenSymbol";
import { useInteraction } from "@/hooks/useInteraction";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload as UploadIcon, Flame, FileVideo, Image as ImageIcon, CheckCircle, ArrowRight, Wallet, Shield } from "lucide-react";
import { toast } from "sonner";
import { FadeIn } from "@/components/animations/FadeIn";

const STATUS_MAP: Record<string, string> = {
  signing: "钱包签名中...",
  uploading: "文件上传中...",
  registering: "链上注册中...",
  done: "上传成功！",
};

export default function UploadPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { burnPermitCount, balance, burnForUpload, isPending: isBurnPending, isConfirming: isBurnConfirming } = useToken();
  const tokenSymbol = useTokenSymbol();
  const { registerVideo, isPending: isRegisterPending, isConfirming: isRegisterConfirming, isConfirmed: isRegisterConfirmed, error: registerError } = useInteraction();

  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [autoCover, setAutoCover] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [step, setStep] = useState(1); // 1=burn, 2=upload
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (burnPermitCount > 0) setStep(2);
  }, [burnPermitCount]);

  useEffect(() => {
    if (status === "registering" && isRegisterConfirming) {
      setUploadProgress(90);
      toast.info("等待链上确认...");
    }
  }, [status, isRegisterConfirming]);

  useEffect(() => {
    if (status === "registering" && isRegisterConfirmed) {
      setUploadProgress(100);
      setStatus("done");
      toast.success("视频注册成功！即将跳转首页...");
      setTimeout(() => router.push("/"), 2000);
    }
  }, [status, isRegisterConfirmed, router]);

  useEffect(() => {
    if (status === "registering" && registerError) {
      toast.error("链上注册失败: " + (registerError.message?.slice(0, 80) || "未知错误"));
      setStatus("");
      setUploadProgress(0);
    }
  }, [status, registerError]);

  const handleBurn = async () => {
    try {
      toast.info("正在发起燃烧交易，请在钱包中确认...");
      await burnForUpload();
      toast.success("燃烧交易已提交，等待确认...");
    } catch (error: any) {
      toast.error("燃烧失败: " + (error.message || "未知错误"));
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error("请输入视频标题");
      return;
    }
    if (!videoFile) {
      toast.error("请选择要上传的视频文件");
      return;
    }
    if (!autoCover && !coverFile) {
      toast.error("请上传封面图片或选择自动生成");
      return;
    }
    if (!address) {
      toast.error("请先连接钱包");
      return;
    }

    try {
      setStatus("signing");
      toast.info("请在钱包中签名以验证身份...");
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `BSC-DApp-Auth:${timestamp}`;
      const signature = await signMessageAsync({ message });
      toast.success("签名成功");

      setStatus("uploading");
      setUploadProgress(10);

      let coverCid = "";
      if (autoCover) {
        toast.info("正在上传视频并自动生成封面...");
        const coverRes = await api.generateCover(videoFile, address, signature, message);
        if (!coverRes.success) throw new Error("封面生成失败");
        coverCid = coverRes.cid;
        setUploadProgress(40);
        toast.success("封面生成完成");
      } else if (coverFile) {
        toast.info("正在上传封面图片...");
        const coverRes = await api.uploadCover(coverFile, address, signature, message);
        if (!coverRes.success) throw new Error("封面上传失败");
        coverCid = coverRes.cid;
        setUploadProgress(30);
        toast.success("封面上传完成");
      }

      toast.info("正在上传视频文件...");
      const timestamp2 = Math.floor(Date.now() / 1000);
      const message2 = `BSC-DApp-Auth:${timestamp2}:upload`;
      const signature2 = await signMessageAsync({ message: message2 });
      const videoRes = await api.uploadVideo(videoFile, address, signature2, message2);
      if (!videoRes.success) throw new Error("视频上传失败");
      const videoCid = videoRes.cid;
      setUploadProgress(80);
      toast.success("视频上传完成，正在注册到链上...");

      setStatus("registering");
      registerVideo(videoCid, title, coverCid);
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "上传失败");
      setStatus("");
      setUploadProgress(0);
    }
  };

  if (!isConnected) {
    return (
      <div className="container flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6 p-12 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Wallet className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">请先连接钱包</h2>
          <p className="text-zinc-400">连接您的钱包后即可上传视频</p>
        </div>
      </div>
    );
  }

  return (
    <FadeIn className="container max-w-3xl py-12 px-4">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-zinc-400 bg-clip-text text-transparent mb-2">
          上传视频
        </h1>
        <p className="text-zinc-400">燃烧代币获取许可，然后上传您的精彩内容</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-10">
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-500 ${
          step === 1 
            ? "bg-orange-500/10 border-orange-500/30 text-orange-400" 
            : burnPermitCount > 0 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-white/5 border-white/10 text-zinc-500"
        }`}>
          {burnPermitCount > 0 ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <Flame className="h-5 w-5" />
          )}
          <span className="font-medium text-sm">1. 燃烧代币</span>
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-600" />
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-500 ${
          step === 2 
            ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
            : "bg-white/5 border-white/10 text-zinc-500"
        }`}>
          <UploadIcon className="h-5 w-5" />
          <span className="font-medium text-sm">2. 上传内容</span>
        </div>
      </div>

      {/* Step 1: Burn */}
      {step === 1 && (
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <Flame className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">燃烧代币获取上传许可</h2>
                <p className="text-sm text-zinc-400 mt-1">上传视频前需要燃烧代币作为凭证</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-zinc-500 mb-1">当前余额</p>
                <p className="text-xl font-bold text-white">{balance.toLocaleString()} <span className="text-sm text-zinc-400">{tokenSymbol}</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-zinc-500 mb-1">燃烧数量</p>
                <p className="text-xl font-bold text-orange-400">50,000 <span className="text-sm text-zinc-400">{tokenSymbol}</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-zinc-500 mb-1">已有许可</p>
                <p className="text-xl font-bold text-emerald-400">{burnPermitCount} <span className="text-sm text-zinc-400">张</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-zinc-500 mb-1">燃烧后余额</p>
                <p className="text-xl font-bold text-zinc-300">{Math.max(0, balance - 50000).toLocaleString()} <span className="text-sm text-zinc-400">{tokenSymbol}</span></p>
              </div>
            </div>

            {balance < 50000 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <Shield className="h-4 w-4 flex-shrink-0" />
                {`余额不足，需要至少 50,000 ${tokenSymbol} 才能燃烧`}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2">
            <Button 
              className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-medium text-base border-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" 
              onClick={handleBurn} 
              disabled={isBurnPending || isBurnConfirming || balance < 50000}
            >
              {isBurnPending || isBurnConfirming ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isBurnPending ? "请在钱包中确认..." : "等待链上确认..."}
                </>
              ) : (
                <>
                  <Flame className="mr-2 h-5 w-5" />
                  {`燃烧 50,000 ${tokenSymbol} 获取许可`}
                </>
              )}
            </Button>
          </CardFooter>
          {burnPermitCount > 0 && (
            <div className="px-6 pb-6">
              <Button 
                variant="ghost" 
                className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                onClick={() => setStep(2)}
              >
                已有 {burnPermitCount} 张许可，直接上传 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 2: Upload */}
      {step === 2 && (
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <UploadIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">上传视频内容</h2>
                  <p className="text-sm text-zinc-400 mt-1">剩余 {burnPermitCount} 张上传许可</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => setStep(1)}>
                返回燃烧
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-zinc-300 font-medium">视频标题 <span className="text-red-400">*</span></Label>
              <Input 
                id="title" 
                placeholder="请输入视频标题" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:ring-blue-500/20"
              />
            </div>

            {/* Video */}
            <div className="space-y-2">
              <Label className="text-zinc-300 font-medium">视频文件 <span className="text-red-400">*</span></Label>
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
                  videoFile 
                    ? "border-emerald-500/30 bg-emerald-500/5" 
                    : "border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5"
                }`}
                onClick={() => videoInputRef.current?.click()}
              >
                <input 
                  ref={videoInputRef}
                  type="file" 
                  accept="video/mp4"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setVideoFile(f);
                    if (f) toast.success(`已选择: ${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`);
                  }}
                  className="hidden"
                />
                {videoFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-white font-medium">{videoFile.name}</p>
                      <p className="text-xs text-zinc-400">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <FileVideo className="h-10 w-10 text-zinc-500 mx-auto mb-3" />
                    <p className="text-zinc-400 mb-1">点击或拖拽选择视频文件</p>
                    <p className="text-xs text-zinc-500">支持 MP4 格式，最大 500MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Cover */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 font-medium">封面图片</Label>
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={autoCover}
                    onChange={(e) => {
                      setAutoCover(e.target.checked);
                      if (e.target.checked) toast.info("将从视频首帧自动生成封面");
                    }}
                    className="rounded border-zinc-600 bg-white/5"
                  />
                  从视频自动生成
                </label>
              </div>
              
              {!autoCover && (
                <div 
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer ${
                    coverFile 
                      ? "border-emerald-500/30 bg-emerald-500/5" 
                      : "border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5"
                  }`}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <input 
                    ref={coverInputRef}
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setCoverFile(f);
                      if (f) toast.success(`封面已选择: ${f.name}`);
                    }}
                    className="hidden"
                  />
                  {coverFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      <span className="text-white">{coverFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                      <p className="text-zinc-400 text-sm">点击选择封面图片</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Progress */}
            {status && (
              <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-400 font-medium">{STATUS_MAP[status] || status}</span>
                  <span className="text-zinc-400">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                {status === "done" && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm mt-2">
                    <CheckCircle className="h-4 w-4" />
                    视频已成功注册，正在跳转...
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2">
            <Button 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-base border-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" 
              onClick={handleUpload}
              disabled={!title || !videoFile || (!autoCover && !coverFile) || !!status || burnPermitCount < 1}
            >
              {status ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {STATUS_MAP[status] || "处理中..."}
                </>
              ) : (
                <>
                  <UploadIcon className="mr-2 h-5 w-5" />
                  上传并注册到链上
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </FadeIn>
  );
}
