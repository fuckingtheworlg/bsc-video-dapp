import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useState, useEffect, useCallback } from 'react';

const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;
const BURN_AMOUNT = parseEther('50000');

// Standard ERC20 ABI — works with any token including client's SEESHOW
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export function useToken() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [burnPermitCount, setBurnPermitCount] = useState(0);

  // Read balance via standard ERC20 balanceOf
  const { data: balance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
        enabled: !!address && !!TOKEN_ADDRESS,
    }
  });

  // Fetch burn permit count from backend
  const fetchPermits = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/permit/count?wallet=${address}`);
      const data = await res.json();
      setBurnPermitCount(data.permits || 0);
    } catch {
      setBurnPermitCount(0);
    }
  }, [address]);

  useEffect(() => {
    fetchPermits();
  }, [fetchPermits]);

  // Burn: transfer 50,000 tokens to dead address
  const burnForUpload = async () => {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [DEAD_ADDRESS, BURN_AMOUNT],
    });
  };

  // After burn confirmed, register permit on backend
  useEffect(() => {
    if (isConfirmed && hash && address) {
      fetch(`${BACKEND_URL}/api/permit/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, txHash: hash }),
      })
        .then(() => fetchPermits())
        .catch(() => {});
    }
  }, [isConfirmed, hash, address, fetchPermits]);

  return {
    balance: balance ? parseFloat(formatEther(balance as bigint)) : 0,
    balanceRaw: balance as bigint | undefined,
    burnPermitCount,
    holdingBonus: 0,
    burnForUpload,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };
}
