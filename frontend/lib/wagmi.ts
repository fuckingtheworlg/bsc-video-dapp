import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  okxWallet,
  tokenPocketWallet,
  binanceWallet,
  walletConnectWallet,
  rainbowWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

const connectors = connectorsForWallets(
  [
    {
      groupName: '推荐',
      wallets: [
        metaMaskWallet,
        okxWallet,
        binanceWallet,
        tokenPocketWallet,
      ],
    },
    {
      groupName: '更多',
      wallets: [
        walletConnectWallet,
        rainbowWallet,
      ],
    },
  ],
  {
    appName: 'SEESHOW',
    projectId,
  }
);

// Production: BSC testnet first; switch to [bsc, bscTestnet] for mainnet launch
// Add hardhat back for local development: [hardhat, bscTestnet, bsc]
export const config = createConfig({
  connectors,
  chains: [bscTestnet, bsc],
  transports: {
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
    [bsc.id]: http('https://bsc-dataseed1.binance.org'),
  },
  ssr: true,
});
