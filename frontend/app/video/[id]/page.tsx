"use client";

import { useQuery } from "@apollo/client";
import { GET_VIDEO, GET_USER_LIKES } from "@/lib/queries";
import { useInteraction } from "@/hooks/useInteraction";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Heart, User, Calendar, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function VideoPage() {
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const { likeVideo, isPending: isLikePending, isConfirming: isLikeConfirming } = useInteraction();

  const { data, loading, error } = useQuery(GET_VIDEO, {
    variables: { id },
    pollInterval: 30000,
  });

  const { data: likeData } = useQuery(GET_USER_LIKES, {
    variables: { 
      liker: address?.toLowerCase(), 
      videoIds: [id] 
    },
    skip: !address || !id,
    pollInterval: 30000,
  });

  const isLiked = useMemo(() => {
    return likeData?.likes?.length > 0;
  }, [likeData]);

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

  if (error || !data?.video) {
    return (
      <div className="container py-8 px-4 flex justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error ? error.message : "Video not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const video = data.video;
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
  const videoUrl = `${gateway}${video.cid}`;

  return (
    <div className="container py-8 px-4 max-w-4xl">
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-6 shadow-lg">
        <video 
          controls 
          className="w-full h-full"
          poster={`${gateway}${video.coverCid}`}
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
                    <span>Uploaded {formatDistanceToNow(Number(video.timestamp) * 1000, { addSuffix: true })}</span>
                    <span>•</span>
                    <span>Round #{video.roundId}</span>
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
