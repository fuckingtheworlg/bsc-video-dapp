import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import VideoInteractionABI from '@/lib/abis/VideoInteraction.json';

const INTERACTION_ADDRESS = process.env.NEXT_PUBLIC_INTERACTION_ADDRESS as `0x${string}`;

export function useInteraction() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Write functions
  const registerVideo = (cid: string, title: string, coverCid: string) => {
    writeContract({
      address: INTERACTION_ADDRESS,
      abi: VideoInteractionABI,
      functionName: 'registerVideo',
      args: [cid, title, coverCid],
    });
  };

  const likeVideo = (videoId: string) => {
    writeContract({
      address: INTERACTION_ADDRESS,
      abi: VideoInteractionABI,
      functionName: 'likeVideo',
      args: [videoId],
    });
  };

  const claim = (roundId: number) => {
    writeContract({
      address: INTERACTION_ADDRESS,
      abi: VideoInteractionABI,
      functionName: 'claim',
      args: [BigInt(roundId)],
    });
  };

  return {
    registerVideo,
    likeVideo,
    claim,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };
}
