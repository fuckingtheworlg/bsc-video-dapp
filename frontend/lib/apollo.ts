import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_SUBGRAPH_URL || "https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID/bsc-dapp-subgraph/version/latest",
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
