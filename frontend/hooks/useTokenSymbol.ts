import { useReadContract } from 'wagmi';

const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`;

const SYMBOL_ABI = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

/**
 * Auto-read token symbol from contract.
 * Falls back to "SEESHOW" if contract is not deployed or read fails.
 */
export function useTokenSymbol() {
  const { data: symbol } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: SYMBOL_ABI,
    functionName: 'symbol',
    query: {
      enabled: !!TOKEN_ADDRESS && TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000',
    },
  });

  return (symbol as string) || 'SEESHOW';
}
