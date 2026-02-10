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
import { RewardPoolMonitor } from "@/components/RewardPoolMonitor";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { VideoLeaderboard } from "@/components/VideoLeaderboard";
import { FadeIn } from "@/components/animations/FadeIn";

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
      <div className="min-h-screen bg-black text-white">
        <Hero />
        <div className="container mx-auto py-12 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
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
      </div>
    );
  }

  // Handle errors gracefully
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Hero />
        <div className="container py-12 px-4">
          <Alert className="mb-6 border-red-500/20 bg-red-500/10 text-red-400">
            <Info className="h-4 w-4" />
            <AlertTitle>连接问题</AlertTitle>
            <AlertDescription>
              无法加载视频。请确保您的钱包已连接到正确的网络。
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 selection:text-blue-200">
      <Hero />
      
      <div className="relative z-10 -mt-20 px-4">
        <RewardPoolMonitor />
      </div>

      {/* Video List — moved above FeatureShowcase */}
      <div id="explore" className="container mx-auto py-20 px-4 relative max-w-7xl">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <FadeIn className="flex justify-center items-center mb-12">
          <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
                  <Sparkles className="h-6 w-6 text-blue-400" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-zinc-400 bg-clip-text text-transparent">
                  发现精彩内容
              </h1>
          </div>
        </FadeIn>

        {videos.length === 0 ? (
          <FadeIn className="flex flex-col items-center justify-center py-32 px-4 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10 backdrop-blur-sm">
            <div className="p-6 rounded-full bg-white/5 mb-6 animate-pulse">
              <Video className="h-16 w-16 text-zinc-500" />
            </div>
            <h3 className="text-2xl font-medium text-white mb-2">暂无视频</h3>
            <p className="text-zinc-400 text-lg max-w-md">
              还没有人上传视频。成为第一个分享精彩时刻的人吧！
            </p>
          </FadeIn>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {videos.map((video: any) => (
              <FadeIn key={video.id}>
                <VideoCard
                  id={video.id}
                  title={video.title}
                  coverCid={video.coverCid}
                  uploader={video.uploader}
                  likeCount={Number(video.likeCount)}
                  timestamp={Number(video.timestamp)}
                  onLike={handleLike}
                  isLiked={likedVideoIds.has(video.id)}
                />
              </FadeIn>
            ))}
          </div>
        )}
      </div>

      {/* Activity Feed + Leaderboard — side by side */}
      <div className="container mx-auto px-4 pb-20 max-w-6xl">
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex flex-col md:flex-row gap-6">
          <LiveActivityFeed />
          <VideoLeaderboard />
        </div>
      </div>

      <FeatureShowcase />
    </div>
  );
}
