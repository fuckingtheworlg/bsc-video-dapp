"use client";

import { useInteraction } from "@/hooks/useInteraction";
import { useAccount, usePublicClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Heart, User, Calendar, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { parseAbiItem } from "viem";

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
  const { address, isConnected } = useAccount();
  const { likeVideo, isPending: isLikePending, isConfirming: isLikeConfirming } = useInteraction();
  const publicClient = usePublicClient();

  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);

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

        // Normalize ID: ensure lowercase, 0x-prefixed, 66-char bytes32 hex
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
          setError("Video not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch video");
      } finally {
        setLoading(false);
      }
    }
    fetchVideo();
  }, [publicClient, id]);

  const handleLike = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet to like videos");
      return;
    }
    if (isLiked) {
      toast.error("You have already liked this video");
      return;
    }
    try {
      likeVideo(id as string);
      toast.success("Transaction submitted");
    } catch (error: any) {
      toast.error(error.message || "Like failed");
    }
  };

  if (loading) {
    return (
      <div className="container py-8 px-4 max-w-4xl">
        <Skeleton className="aspect-video w-full rounded-xl mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="container py-8 px-4 flex justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Video not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Use local backend for files in dev mode, IPFS gateway in production
  const isLocalFile = video.cid && !video.cid.startsWith("Qm") && !video.cid.startsWith("bafy");
  const videoUrl = isLocalFile ? `${BACKEND_URL}/api/local-ipfs/${video.cid}` : `${process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/"}${video.cid}`;
  const coverUrl = isLocalFile ? `${BACKEND_URL}/api/local-ipfs/${video.coverCid}` : `${process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/"}${video.coverCid}`;

  return (
    <div className="container py-8 px-4 max-w-4xl">
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-6 shadow-lg">
        <video 
          controls 
          className="w-full h-full"
          poster={coverUrl}
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">{video.title}</h1>
          
          <Button 
            size="lg" 
            variant={isLiked ? "outline" : "secondary"}
            className={`gap-2 min-w-[120px] ${isLiked ? "text-red-500 border-red-500" : ""}`}
            onClick={handleLike}
            disabled={isLikePending || isLikeConfirming || isLiked}
          >
            {isLikePending || isLikeConfirming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
            )}
            <span className="font-bold text-lg">{Number(video.likeCount)}</span>
          </Button>
        </div>

        <div className="flex items-center gap-4 py-4 border-y">
            <Avatar className="h-12 w-12">
                <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${video.uploader}`} />
                <AvatarFallback><User /></AvatarFallback>
            </Avatar>
            <div>
                <p className="font-medium text-lg flex items-center gap-2">
                    {video.uploader}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Uploaded {video.timestamp > 1000000 ? formatDistanceToNow(Number(video.timestamp) * 1000, { addSuffix: true }) : "Just now"}</span>
                    <span>•</span>
                    <span>ID: {(video.id as string).slice(0, 10)}...</span>
                </div>
            </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-muted-foreground">Video CID:</span>
                    <p className="font-mono truncate" title={video.cid}>{video.cid}</p>
                </div>
                <div>
                    <span className="text-muted-foreground">Cover CID:</span>
                    <p className="font-mono truncate" title={video.coverCid}>{video.coverCid}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
