import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import VideTokenABI from '@/lib/abis/VideToken.json';

const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`;

export function useToken() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read functions
  const { data: balance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: VideTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
        enabled: !!address,
    }
  });

  const { data: burnPermitCount } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: VideTokenABI,
    functionName: 'burnPermitCount',
    args: address ? [address] : undefined,
    query: {
        enabled: !!address,
    }
  });

  const { data: holdingBonus } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: VideTokenABI,
    functionName: 'getHoldingBonus',
    args: address ? [address] : undefined,
    query: {
        enabled: !!address,
    }
  });

  // Write functions
  const burnForUpload = async () => {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: VideTokenABI,
      functionName: 'burnForUpload',
    });
  };

  return {
    balance: balance ? parseFloat(formatEther(balance as bigint)) : 0,
    balanceRaw: balance as bigint | undefined,
    burnPermitCount: burnPermitCount ? Number(burnPermitCount) : 0,
    holdingBonus: holdingBonus ? Number(holdingBonus) : 0,
    burnForUpload,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };
}
