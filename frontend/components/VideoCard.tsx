"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Play, User } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface VideoCardProps {
  id: string;
  title: string;
  coverCid: string;
  uploader: string;
  likeCount: number;
  timestamp: number;
  onLike?: (id: string) => void;
  isLiked?: boolean;
}

export function VideoCard({ 
  id, 
  title, 
  coverCid, 
  uploader, 
  likeCount, 
  timestamp,
  onLike,
  isLiked = false
}: VideoCardProps) {
  const [imgError, setImgError] = useState(false);
  
  // Truncate address
  const shortAddress = `${uploader.slice(0, 6)}...${uploader.slice(-4)}`;
  
  // Gateway URL from environment variable
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
  const coverUrl = `${gateway}${coverCid}`;

  return (
    <Card className="overflow-hidden group hover:border-primary/50 transition-all duration-300">
      <div className="relative aspect-video bg-muted cursor-pointer overflow-hidden">
        {!imgError ? (
            <img 
              src={coverUrl} 
              alt={title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
        ) : (
            <div className="flex items-center justify-center w-full h-full bg-neutral-800">
                <Play className="w-12 h-12 text-muted-foreground" />
            </div>
        )}
        
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Link href={`/video/${id}`}>
                <Button size="icon" variant="secondary" className="rounded-full w-12 h-12">
                    <Play className="w-5 h-5 ml-1" />
                </Button>
            </Link>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1 mb-2" title={title}>{title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="w-6 h-6">
                <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${uploader}`} />
                <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
            </Avatar>
            <span className="hover:text-foreground transition-colors">
                {shortAddress}
            </span>
            <span>•</span>
            <span>{formatDistanceToNow(timestamp * 1000, { addSuffix: true })}</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <Button 
            variant="ghost" 
            size="sm" 
            className={`gap-2 hover:text-red-500 ${isLiked ? "text-red-500" : "text-muted-foreground"}`}
            onClick={(e) => {
                e.preventDefault();
                onLike?.(id);
            }}
        >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            {likeCount}
        </Button>
      </CardFooter>
    </Card>
  );
}
