'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { ApolloProvider } from "@apollo/client";
import { config } from '@/lib/wagmi';
import { client } from "@/lib/apollo";
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={client}>
      <Web3Provider>
        {children}
      </Web3Provider>
    </ApolloProvider>
  );
}
