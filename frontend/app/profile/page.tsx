"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@apollo/client";
import { GET_USER_STATS, GET_USER_VIDEOS, GET_USER_CLAIMS } from "@/lib/queries";
import { useToken } from "@/hooks/useToken";
import { VideoCard } from "@/components/VideoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Flame, Trophy, Heart, Video as VideoIcon, Wallet, History } from "lucide-react";
import { formatEther } from "viem";
import { formatDistanceToNow } from "date-fns";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { balance, burnPermitCount, holdingBonus } = useToken();

  const { data: statsData, loading: statsLoading } = useQuery(GET_USER_STATS, {
    variables: { id: address?.toLowerCase() },
    skip: !address,
  });

  const { data: videosData, loading: videosLoading } = useQuery(GET_USER_VIDEOS, {
    variables: { uploader: address?.toLowerCase() },
    skip: !address,
  });

  const { data: claimsData, loading: claimsLoading } = useQuery(GET_USER_CLAIMS, {
    variables: { user: address?.toLowerCase() },
    skip: !address,
  });

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

  const stats = statsData?.userStats || {
    totalBurned: "0",
    totalRewards: "0",
    totalLikesGiven: "0",
    totalLikesReceived: "0",
    videoCount: "0",
    claimCount: "0",
  };

  const videos = videosData?.videos || [];
  const claims = claimsData?.rewardClaims || [];

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
                    Total Burned: {formatEther(BigInt(stats.totalBurned))} VIDE
                </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rewards</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{formatEther(BigInt(stats.totalRewards))} VIDE</div>
                <p className="text-xs text-muted-foreground">
                    Claims: {stats.claimCount}
                </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Interactions</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{stats.totalLikesReceived} Received</div>
                <p className="text-xs text-muted-foreground">
                    {stats.totalLikesGiven} Given
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
                {claimsLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                             <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                ) : claims.length === 0 ? (
                    <div className="text-center py-20 border rounded-lg bg-muted/10">
                        <p className="text-muted-foreground text-lg">No rewards claimed yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {claims.map((claim: any) => (
                            <Card key={claim.id}>
                                <CardContent className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-yellow-500/10 p-2 rounded-full">
                                            <Trophy className="h-6 w-6 text-yellow-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Round #{claim.round.roundNumber} Reward</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(Number(claim.timestamp) * 1000, { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-green-600">
                                            +{formatEther(BigInt(claim.amount))} VIDE
                                        </p>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            {claim.id.slice(0, 10)}...{claim.id.slice(-8)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
