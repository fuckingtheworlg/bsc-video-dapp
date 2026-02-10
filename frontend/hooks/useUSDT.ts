import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';

const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`;
const SKIP_BALANCE_CHECK = process.env.NEXT_PUBLIC_SKIP_BALANCE_CHECK === 'true';

// Minimal ERC-20 ABI for balanceOf
const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useUSDT() {
  const { address } = useAccount();

  const { data: balance, isLoading, refetch } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!USDT_ADDRESS,
    },
  });

  const balanceFormatted = balance ? parseFloat(formatUnits(balance, 18)) : 0;
  const isEligible = SKIP_BALANCE_CHECK ? true : balanceFormatted >= 20;

  return {
    balance: balanceFormatted,
    balanceRaw: balance as bigint | undefined,
    isEligible,
    isLoading: SKIP_BALANCE_CHECK ? false : isLoading,
    refetch,
  };
}
