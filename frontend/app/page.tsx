"use client";

import { VideoCard } from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { useAccount } from "wagmi";
import { useInteraction } from "@/hooks/useInteraction";
import { useVideos } from "@/hooks/useVideos";
import { toast } from "sonner";
import { useState } from "react";

export default function Home() {
  const { isConnected } = useAccount();
  const { likeVideo } = useInteraction();
  const { videos, loading, error } = useVideos();
  const [likedVideoIds] = useState<Set<string>>(new Set());

  const handleLike = (id: string) => {
    if (!isConnected) {
      toast.error("Please connect your wallet to like videos");
      return;
    }
    try {
      likeVideo(id);
      toast.success("Like transaction submitted");
    } catch (error: any) {
      toast.error(error.message || "Like failed");
    }
  };

  if (loading) {
    return (
      <div className="container py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Latest Videos</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
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
      <div className="container py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Latest Videos</h1>
        </div>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Connection Issue</AlertTitle>
          <AlertDescription>
            Unable to load videos. Make sure your wallet is connected to the correct network.
          </AlertDescription>
        </Alert>
        <div className="text-center py-10">
          <p className="text-muted-foreground">Connect wallet and upload your first video!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Latest Videos</h1>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No videos uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
  );
}
