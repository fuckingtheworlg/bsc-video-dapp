import { useReadContract } from 'wagmi';
import VideTokenABI from '@/lib/abis/VideToken.json';

const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`;

/**
 * Auto-read token symbol from contract.
 * Falls back to "SEESHOW" if contract is not deployed or read fails.
 */
export function useTokenSymbol() {
  const { data: symbol } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: VideTokenABI,
    functionName: 'symbol',
    query: {
      enabled: !!TOKEN_ADDRESS && TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000',
    },
  });

  return (symbol as string) || 'SEESHOW';
}
