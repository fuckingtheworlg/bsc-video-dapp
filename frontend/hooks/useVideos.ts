import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';

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

  useEffect(() => {
    async function fetchVideos() {
      if (!publicClient || !INTERACTION_ADDRESS) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch VideoRegistered events from the contract
        const logs = await publicClient.getLogs({
          address: INTERACTION_ADDRESS,
          event: parseAbiItem('event VideoRegistered(bytes32 indexed videoId, address indexed uploader, string cid, string title, string coverCid, uint256 timestamp)'),
          fromBlock: 0n,
          toBlock: 'latest',
        });

        // Transform logs to video objects
        const videoList: Video[] = logs.map((log) => ({
          id: log.args.videoId as string,
          cid: (log.args as any).cid || '',
          title: (log.args as any).title || '',
          coverCid: (log.args as any).coverCid || '',
          uploader: log.args.uploader as string,
          likeCount: 0, // Would need separate call to get like count
          timestamp: Number((log.args as any).timestamp || 0),
        })).reverse(); // Newest first

        setVideos(videoList);
        setError(null);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchVideos, 30000);
    return () => clearInterval(interval);
  }, [publicClient]);

  return { videos, loading, error, refetch: () => {} };
}
