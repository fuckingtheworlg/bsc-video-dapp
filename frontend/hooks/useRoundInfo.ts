import { useReadContract } from 'wagmi';
import VideoInteractionABI from '@/lib/abis/VideoInteraction.json';

const INTERACTION_ADDRESS = process.env.NEXT_PUBLIC_INTERACTION_ADDRESS as `0x${string}`;

export interface RoundData {
  startTime: bigint;
  endTime: bigint;
  settled: boolean;
  merkleRoot: string;
  rewardPool: bigint;
  totalClaimed: bigint;
  participantCount: bigint;
  topVideos: readonly `0x${string}`[];
  topLikes: readonly bigint[];
}

export function useRoundInfo() {
  const { data: currentRoundId } = useReadContract({
    address: INTERACTION_ADDRESS,
    abi: VideoInteractionABI,
    functionName: 'currentRoundId',
  });

  const { data: roundData } = useReadContract({
    address: INTERACTION_ADDRESS,
    abi: VideoInteractionABI,
    functionName: 'getRound',
    args: currentRoundId ? [currentRoundId] : undefined,
    query: {
      enabled: !!currentRoundId,
    }
  });

  const { data: timeRemaining } = useReadContract({
    address: INTERACTION_ADDRESS,
    abi: VideoInteractionABI,
    functionName: 'timeUntilRoundEnd',
    query: {
        refetchInterval: 1000, // Refresh every second
    }
  });

  return {
    currentRoundId: currentRoundId as bigint | undefined,
    roundData: roundData as RoundData | undefined,
    timeRemaining: timeRemaining as bigint | undefined,
  };
}
