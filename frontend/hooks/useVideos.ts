import { useEffect, useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import VideoInteractionABI from '@/lib/abis/VideoInteraction.json';

const INTERACTION_ADDRESS = process.env.NEXT_PUBLIC_INTERACTION_ADDRESS as `0x${string}`;

export interface Video {
  id: string;
  cid: string;
  title: string;
  coverCid: string;
  uploader: string;
  likeCount: number;
  timestamp: number;
}

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const publicClient = usePublicClient();

  const fetchVideos = useCallback(async () => {
    if (!publicClient || !INTERACTION_ADDRESS) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Get current round ID
      const currentRoundId = await publicClient.readContract({
        address: INTERACTION_ADDRESS,
        abi: VideoInteractionABI,
        functionName: 'currentRoundId',
      }) as bigint;

      // 2. Collect video IDs from all rounds
      const allVideoIds = new Set<string>();
      const roundCount = Number(currentRoundId);

      for (let r = 1; r <= roundCount; r++) {
        try {
          const ids = await publicClient.readContract({
            address: INTERACTION_ADDRESS,
            abi: VideoInteractionABI,
            functionName: 'getRoundVideos',
            args: [BigInt(r)],
          }) as readonly `0x${string}`[];
          ids.forEach((id) => allVideoIds.add(id));
        } catch {
          // Round may not exist or have no videos
        }
      }

      // 3. Fetch full video details from the videos mapping
      const videoList: Video[] = (await Promise.all(
        Array.from(allVideoIds).map(async (videoId) => {
          try {
            const data = await publicClient.readContract({
              address: INTERACTION_ADDRESS,
              abi: VideoInteractionABI,
              functionName: 'videos',
              args: [videoId],
            }) as any[];
            // data: [uploader, cid, title, coverCid, timestamp, roundId, likeCount, exists]
            if (!data[7]) return null; // exists == false
            return {
              id: videoId,
              uploader: data[0] as string,
              cid: data[1] as string,
              title: data[2] as string,
              coverCid: data[3] as string,
              timestamp: Number(data[4] || 0),
              likeCount: Number(data[6] || 0),
            };
          } catch {
            return null;
          }
        })
      )).filter((v): v is Video => v !== null);

      // 4. Sort by likeCount descending
      videoList.sort((a, b) => b.likeCount - a.likeCount);

      setVideos(videoList);
      setError(null);
    } catch (err) {
      // Error fetching videos
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchVideos();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchVideos, 30000);
    return () => clearInterval(interval);
  }, [fetchVideos]);

  return { videos, loading, error, refetch: fetchVideos };
}
