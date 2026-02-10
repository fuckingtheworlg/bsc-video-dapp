"use client";

import { useAccount } from "wagmi";
import { useToken } from "@/hooks/useToken";
import { useVideos } from "@/hooks/useVideos";
import { VideoCard } from "@/components/VideoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Flame, Trophy, Heart, Video as VideoIcon, Wallet, History } from "lucide-react";
import { useMemo } from "react";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { balance, burnPermitCount, holdingBonus } = useToken();
  const { videos: allVideos, loading: videosLoading } = useVideos();

  // Filter videos uploaded by the current user
  const videos = useMemo(() => {
    if (!address || !allVideos) return [];
    return allVideos.filter((v) => v.uploader.toLowerCase() === address.toLowerCase());
  }, [allVideos, address]);

  if (!isConnected) {
    return (
      <div className="container flex items-center justify-center min-h-[60vh]">
        <Alert className="max-w-md">
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>Please connect your wallet to view your profile.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4">
      <div className="flex flex-col gap-8">
        {/* Header Stats */}
        <div>
            <h1 className="text-3xl font-bold mb-6">My Profile</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{balance.toLocaleString()} VIDE</div>
                <p className="text-xs text-muted-foreground">
                    + {holdingBonus}% Holding Bonus
                </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upload Permits</CardTitle>
                <Flame className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{burnPermitCount}</div>
                <p className="text-xs text-muted-foreground">
                    Available permits
                </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Videos</CardTitle>
                <VideoIcon className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{videos.length}</div>
                <p className="text-xs text-muted-foreground">
                    Uploaded videos
                </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Holding Bonus</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">+{holdingBonus}%</div>
                <p className="text-xs text-muted-foreground">
                    Reward multiplier
                </p>
                </CardContent>
            </Card>
            </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="w-full">
            <TabsList>
                <TabsTrigger value="videos" className="gap-2">
                    <VideoIcon className="h-4 w-4" />
                    My Videos
                </TabsTrigger>
                <TabsTrigger value="claims" className="gap-2">
                    <History className="h-4 w-4" />
                    Reward History
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="videos" className="mt-6">
                {videosLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex flex-col space-y-3">
                                <Skeleton className="h-[200px] w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : videos.length === 0 ? (
                    <div className="text-center py-20 border rounded-lg bg-muted/10">
                        <p className="text-muted-foreground text-lg mb-4">You haven't uploaded any videos yet.</p>
                        <a href="/upload" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                            Upload Now
                        </a>
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
                            />
                        ))}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="claims" className="mt-6">
                <div className="text-center py-20 border rounded-lg bg-muted/10">
                    <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">Reward history will be available after subgraph deployment.</p>
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
