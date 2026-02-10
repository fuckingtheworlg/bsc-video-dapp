"use client";

import { useAccount } from "wagmi";
import { useToken } from "@/hooks/useToken";
import { useVideos } from "@/hooks/useVideos";
import { VideoCard } from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Heart, Video as VideoIcon, Wallet, History, User, Copy, CheckCircle, Upload, TrendingUp, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { balance, burnPermitCount, holdingBonus } = useToken();
  const { videos: allVideos, loading: videosLoading } = useVideos();
  const [activeTab, setActiveTab] = useState("videos");
  const [copied, setCopied] = useState(false);

  // Filter videos uploaded by the current user
  const videos = useMemo(() => {
    if (!address || !allVideos) return [];
    return allVideos.filter((v) => v.uploader.toLowerCase() === address.toLowerCase());
  }, [allVideos, address]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("地址已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <FadeIn className="container flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6 p-12 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Wallet className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">请先连接钱包</h2>
          <p className="text-zinc-400">连接您的钱包后即可查看个人中心</p>
        </div>
      </FadeIn>
    );
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  const stats = [
    {
      label: "代币余额",
      value: balance.toLocaleString(),
      unit: "VIDE",
      sub: `持仓加成 +${holdingBonus}%`,
      icon: Wallet,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "上传许可",
      value: burnPermitCount.toString(),
      unit: "张",
      sub: "可用于上传视频",
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
    {
      label: "我的视频",
      value: videos.length.toString(),
      unit: "个",
      sub: "已上传视频",
      icon: VideoIcon,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
    },
    {
      label: "奖励加成",
      value: `+${holdingBonus}`,
      unit: "%",
      sub: "基于持仓时间",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
  ];

  return (
    <FadeIn className="container py-12 px-4">
      <div className="flex flex-col gap-10">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm">
          <Avatar className="h-20 w-20 ring-4 ring-white/10">
            <AvatarImage src={address ? `https://api.dicebear.com/7.x/identicon/svg?seed=${address}` : undefined} />
            <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1">个人中心</h1>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="font-mono text-sm">{shortAddress}</span>
              <button onClick={copyAddress} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Link href="/upload">
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-0 gap-2 transition-all duration-300 hover:scale-105">
              <Upload className="h-4 w-4" />
              上传视频
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`p-5 rounded-2xl bg-white/5 border border-white/5 hover:${stat.border} transition-all duration-300 group`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-zinc-400">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white">{stat.value}</span>
                <span className="text-sm text-zinc-500">{stat.unit}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Content Tabs */}
        <div>
          <div className="flex items-center gap-2 mb-8">
            <button
              onClick={() => setActiveTab("videos")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === "videos"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <VideoIcon className="h-4 w-4" />
              我的视频
            </button>
            <button
              onClick={() => setActiveTab("claims")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === "claims"
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <History className="h-4 w-4" />
              奖励记录
            </button>
          </div>

          {activeTab === "videos" && (
            <>
              {videosLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col space-y-4">
                      <Skeleton className="h-[220px] w-full rounded-2xl bg-white/5" />
                      <div className="space-y-3 px-1">
                        <Skeleton className="h-5 w-[80%] bg-white/5" />
                        <Skeleton className="h-4 w-[60%] bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <div className="p-4 rounded-full bg-white/5 mb-6">
                    <VideoIcon className="h-12 w-12 text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">还没有上传视频</h3>
                  <p className="text-zinc-400 mb-6 max-w-md">
                    燃烧代币获取许可后即可上传您的精彩视频
                  </p>
                  <Link href="/upload">
                    <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-0 gap-2">
                      <Upload className="h-4 w-4" />
                      去上传
                    </Button>
                  </Link>
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
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "claims" && (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white/5 rounded-3xl border border-white/5">
              <div className="p-4 rounded-full bg-yellow-500/10 mb-6">
                <Trophy className="h-12 w-12 text-yellow-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">奖励记录</h3>
              <p className="text-zinc-400 max-w-md">
                每 45 分钟结算一次奖励。参与点赞互动即有机会获得代币奖励。
              </p>
            </div>
          )}
        </div>
      </div>
    </FadeIn>
  );
}
