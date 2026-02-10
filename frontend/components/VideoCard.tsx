"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Play, User } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
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
  
  // Use local backend for files in dev mode, IPFS gateway in production
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
  const isLocalFile = coverCid && !coverCid.startsWith("Qm") && !coverCid.startsWith("bafy");
  const coverUrl = isLocalFile ? `${backendUrl}/api/local-ipfs/${coverCid}` : `${gateway}${coverCid}`;

  return (
    <Card className="overflow-hidden group border-white/5 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)]">
      <div className="relative aspect-video bg-neutral-900 cursor-pointer overflow-hidden">
        {!imgError ? (
            <img 
              src={coverUrl} 
              alt={title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
              onError={() => setImgError(true)}
            />
        ) : (
            <div className="flex items-center justify-center w-full h-full bg-neutral-900">
                <Play className="w-12 h-12 text-white/20" />
            </div>
        )}
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
            <Link href={`/video/${id}`}>
                <Button size="icon" variant="secondary" className="rounded-full w-16 h-16 bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 shadow-lg shadow-black/20">
                    <Play className="w-8 h-8 ml-1 fill-white" />
                </Button>
            </Link>
        </div>
      </div>

      <CardContent className="p-5">
        <h3 className="font-semibold text-lg line-clamp-1 mb-4 text-white group-hover:text-blue-400 transition-colors" title={title}>{title}</h3>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Avatar className="w-9 h-9 ring-2 ring-white/10 transition-transform group-hover:scale-105">
                <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${uploader}`} />
                <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-300 hover:text-white transition-colors font-medium cursor-pointer">
                  {shortAddress}
              </span>
              <span className="text-xs text-zinc-500">
                {timestamp > 1000000 
                  ? formatDistanceToNow(timestamp * 1000, { addSuffix: true, locale: zhCN }) 
                  : "刚刚"}
              </span>
            </div>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0 flex justify-between items-center border-t border-white/5 mt-2">
        <div className="flex items-center gap-1">
          <Button 
              variant="ghost" 
              size="sm" 
              className={`gap-2 px-3 hover:bg-white/10 transition-all ${isLiked ? "text-red-500 hover:text-red-400" : "text-zinc-400 hover:text-red-400"}`}
              onClick={(e) => {
                  e.preventDefault();
                  onLike?.(id);
              }}
          >
              <Heart className={`w-5 h-5 transition-transform active:scale-125 ${isLiked ? "fill-current" : ""}`} />
              <span className="font-medium text-base">{likeCount}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
