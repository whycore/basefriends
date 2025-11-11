import { createConfig, http, fallback } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { injected } from "wagmi/connectors";

const baseSepoliaRpcUrls = [
  "https://sepolia.base.org",
  "https://base-sepolia-rpc.publicnode.com",
  "https://base-sepolia.gateway.tenderly.co",
] as const;

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    farcasterMiniApp(),
    injected(),
  ],
  transports: {
    [baseSepolia.id]: fallback(
      baseSepoliaRpcUrls.map((url) =>
        http(url, {
          retryCount: 3,
          retryDelay: 1000,
          timeout: 15000,
        }),
      ),
    ),
    [base.id]: http(),
  },
});


