"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RPC_URL } from "@/lib/config";

import "@solana/wallet-adapter-react-ui/styles.css";

/** Wallet Standard wallets (Phantom, Solflare, Backpack) register themselves, so no adapters are listed. */
const WALLETS: never[] = [];

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={RPC_URL} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={WALLETS} autoConnect localStorageKey="monthly-wallet">
        <WalletModalProvider>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
