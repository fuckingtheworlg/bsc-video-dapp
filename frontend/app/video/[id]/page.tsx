"use client";

import { useInteraction } from "@/hooks/useInteraction";
import { useAccount, usePublicClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, User, Calendar, Loader2, ArrowLeft, Copy, CheckCircle, Eye, Link2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { parseAbiItem } from "viem";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";

const INTERACTION_ADDRESS = process.env.NEXT_PUBLIC_INTERACTION_ADDRESS as `0x${string}`;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface VideoData {
  id: string;
  cid: string;
  title: string;
  coverCid: string;
  uploader: string;
  likeCount: number;
  timestamp: number;
}

export default function VideoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { likeVideo, isPending: isLikePending, isConfirming: isLikeConfirming, isConfirmed: isLikeConfirmed } = useInteraction();
  const publicClient = usePublicClient();

  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideo() {
      if (!publicClient || !INTERACTION_ADDRESS || !id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const logs = await publicClient.getLogs({
          address: INTERACTION_ADDRESS,
          event: parseAbiItem('event VideoRegistered(bytes32 indexed videoId, address indexed uploader, string cid, string title, string coverCid, uint256 timestamp)'),
          fromBlock: BigInt(0),
          toBlock: 'latest',
        });

        const normalizeId = (v: string) => {
          let h = v.toLowerCase();
          if (!h.startsWith('0x')) h = '0x' + h;
          return h.padEnd(66, '0');
        };
        const targetId = normalizeId(id as string);
        const found = logs.find((log) => normalizeId(log.args.videoId as string) === targetId);
        if (found) {
          setVideo({
            id: found.args.videoId as string,
            cid: (found.args as any).cid || '',
            title: (found.args as any).title || '',
            coverCid: (found.args as any).coverCid || '',
            uploader: found.args.uploader as string,
            likeCount: 0,
            timestamp: Number((found.args as any).timestamp || 0),
          });
        } else {
          setError("未找到该视频");
        }
      } catch (err: any) {
        setError(err.message || "加载视频失败");
      } finally {
        setLoading(false);
      }
    }
    fetchVideo();
  }, [publicClient, id]);

  useEffect(() => {
    if (isLikeConfirmed && !isLiked) {
      setIsLiked(true);
      toast.success("点赞成功！感谢您的支持");
    }
  }, [isLikeConfirmed, isLiked]);

  const handleLike = async () => {
    if (!isConnected) {
      toast.error("请先连接钱包才能点赞");
      return;
    }
    if (video && address && video.uploader.toLowerCase() === address.toLowerCase()) {
      toast.warning("不能给自己的视频点赞哦");
      return;
    }
    if (isLiked) {
      toast.warning("您已经点过赞了");
      return;
    }
    try {
      toast.info("正在发起点赞交易，请在钱包中确认...");
      likeVideo(id as string);
    } catch (error: any) {
      toast.error("点赞失败: " + (error.message || "未知错误"));
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <FadeIn className="container py-8 px-4 max-w-5xl">
        <Skeleton className="aspect-video w-full rounded-2xl mb-8 bg-white/5" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3 bg-white/5" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full bg-white/5" />
            <Skeleton className="h-4 w-1/3 bg-white/5" />
          </div>
        </div>
      </FadeIn>
    );
  }

  if (error || !video) {
    return (
      <FadeIn className="container py-20 px-4 flex justify-center">
        <div className="text-center space-y-6 p-12 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">{error || "未找到该视频"}</h2>
          <p className="text-zinc-400">该视频可能已被删除或 ID 不正确</p>
          <Button variant="ghost" className="text-blue-400 hover:text-blue-300" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回首页
          </Button>
        </div>
      </FadeIn>
    );
  }

  const isLocalFile = video.cid && !video.cid.startsWith("Qm") && !video.cid.startsWith("bafy");
  const videoUrl = isLocalFile ? `${BACKEND_URL}/api/local-ipfs/${video.cid}` : `${process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/"}${video.cid}`;
  const coverUrl = isLocalFile ? `${BACKEND_URL}/api/local-ipfs/${video.coverCid}` : `${process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/"}${video.coverCid}`;
  const shortUploader = `${video.uploader.slice(0, 6)}...${video.uploader.slice(-4)}`;

  return (
    <FadeIn className="container py-8 px-4 max-w-5xl">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 group text-sm">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        返回首页
      </Link>

      {/* Video Player - Cinema Mode */}
      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-8 ring-1 ring-white/10 shadow-2xl shadow-black/50">
        <video 
          controls 
          className="w-full h-full"
          poster={coverUrl}
          src={videoUrl}
        >
          您的浏览器不支持视频播放。
        </video>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title + Like */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{video.title}</h1>
            
            <Button 
              size="lg" 
              className={`gap-3 min-w-[140px] h-12 rounded-xl font-medium transition-all duration-300 ${
                isLiked 
                  ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20" 
                  : "bg-white/10 text-white border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
              }`}
              onClick={handleLike}
              disabled={isLikePending || isLikeConfirming || isLiked}
            >
              {isLikePending || isLikeConfirming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Heart className={`h-5 w-5 transition-transform active:scale-125 ${isLiked ? "fill-current" : ""}`} />
              )}
              <span className="font-bold text-lg">{isLiked ? Number(video.likeCount) + 1 : Number(video.likeCount)}</span>
              <span className="text-sm">{isLikePending ? "确认中" : isLikeConfirming ? "上链中" : "点赞"}</span>
            </Button>
          </div>

          {/* Uploader */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
              <Avatar className="h-12 w-12 ring-2 ring-white/10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${video.uploader}`} />
                  <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                  <p className="font-medium text-white flex items-center gap-2">
                      {shortUploader}
                      <button 
                        onClick={() => copyToClipboard(video.uploader, 'uploader')}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="复制完整地址"
                      >
                        {copiedField === 'uploader' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                  </p>
                  <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {video.timestamp > 1000000 
                          ? formatDistanceToNow(Number(video.timestamp) * 1000, { addSuffix: true, locale: zhCN }) 
                          : "刚刚上传"}
                      </span>
                  </div>
              </div>
          </div>
        </div>

        {/* Sidebar - Details */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-400" />
              链上信息
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500 mb-1">视频 ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-zinc-300 truncate flex-1" title={video.id}>{video.id}</p>
                  <button 
                    onClick={() => copyToClipboard(video.id, 'id')}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                  >
                    {copiedField === 'id' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <p className="text-xs text-zinc-500 mb-1">视频 CID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-zinc-300 truncate flex-1" title={video.cid}>{video.cid}</p>
                  <button 
                    onClick={() => copyToClipboard(video.cid, 'cid')}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                  >
                    {copiedField === 'cid' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <p className="text-xs text-zinc-500 mb-1">封面 CID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-zinc-300 truncate flex-1" title={video.coverCid}>{video.coverCid}</p>
                  <button 
                    onClick={() => copyToClipboard(video.coverCid, 'coverCid')}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                  >
                    {copiedField === 'coverCid' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-blue-400" />
              互动数据
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-white/5">
                <p className="text-2xl font-bold text-red-400">
                  {isLiked ? Number(video.likeCount) + 1 : Number(video.likeCount)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">点赞数</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <p className="text-2xl font-bold text-blue-400">
                  {video.timestamp > 1000000 
                    ? Math.floor((Date.now() / 1000 - video.timestamp) / 3600)
                    : 0}h
                </p>
                <p className="text-xs text-zinc-500 mt-1">已发布</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
