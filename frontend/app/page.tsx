"use client";

import { VideoCard } from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Sparkles, Video } from "lucide-react";
import { useAccount } from "wagmi";
import { useInteraction } from "@/hooks/useInteraction";
import { useVideos } from "@/hooks/useVideos";
import { toast } from "sonner";
import { useState } from "react";
import { Hero } from "@/components/Hero";
import { FeatureShowcase } from "@/components/FeatureShowcase";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { likeVideo } = useInteraction();
  const { videos, loading, error } = useVideos();
  const [likedVideoIds] = useState<Set<string>>(new Set());

  const handleLike = (id: string) => {
    if (!isConnected) {
      toast.error("请先连接钱包以点赞视频");
      return;
    }
    const target = videos.find((v: any) => v.id === id);
    if (target && address && target.uploader.toLowerCase() === address.toLowerCase()) {
      toast.warning("不能给自己的视频点赞哦");
      return;
    }
    try {
      likeVideo(id);
      toast.info("正在发起点赞交易，请在钱包中确认...");
    } catch (error: any) {
      toast.error(error.message || "点赞失败");
    }
  };

  if (loading) {
    return (
      <div className="container py-12 px-4">
        <div className="flex items-center gap-3 mb-10">
            <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
            <div className="h-8 w-48 rounded-lg bg-white/10 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-4">
              <Skeleton className="h-[220px] w-full rounded-2xl bg-white/5" />
              <div className="space-y-3 px-1">
                <Skeleton className="h-5 w-[80%] bg-white/5" />
                <Skeleton className="h-4 w-[60%] bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle errors gracefully
  if (error) {
    return (
      <div className="container py-12 px-4">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">最新视频</h1>
        </div>
        <Alert className="mb-6 border-red-500/20 bg-red-500/10 text-red-400">
          <Info className="h-4 w-4" />
          <AlertTitle>连接问题</AlertTitle>
          <AlertDescription>
            无法加载视频。请确保您的钱包已连接到正确的网络。
          </AlertDescription>
        </Alert>
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
          <p className="text-zinc-400 text-lg">连接钱包并上传您的第一个视频！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Hero />
      <FeatureShowcase />
      
      <div id="explore" className="container py-20 px-4">
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
                  <Sparkles className="h-6 w-6 text-blue-400" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-zinc-400 bg-clip-text text-transparent">
                  Explore Content
              </h1>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-4 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 backdrop-blur-sm">
            <div className="p-6 rounded-full bg-white/5 mb-6 animate-pulse">
              <Video className="h-16 w-16 text-zinc-500" />
            </div>
            <h3 className="text-2xl font-medium text-white mb-2">No Videos Yet</h3>
            <p className="text-zinc-400 text-lg max-w-md">
              Be the first to share your creation with the world!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {videos.map((video: any) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                coverCid={video.coverCid}
                uploader={video.uploader}
                likeCount={Number(video.likeCount)}
                timestamp={Number(video.timestamp)}
                onLike={handleLike}
                isLiked={likedVideoIds.has(video.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
