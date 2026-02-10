import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet, hardhat } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'BSC Video DApp',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [hardhat, bscTestnet, bsc],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
