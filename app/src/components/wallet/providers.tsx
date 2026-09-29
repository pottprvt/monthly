"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { WalletError } from "@solana/wallet-adapter-base";
import { type ReactNode, useCallback } from "react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RPC_URL } from "@/lib/config";

import "@solana/wallet-adapter-react-ui/styles.css";

/** Wallet Standard wallets (Phantom, Solflare, Backpack) register themselves, so no adapters are listed. */
const WALLETS: never[] = [];

export function Providers({ children }: { children: ReactNode }) {
  // Without this handler the adapter logs every wallet error (closed popup, rejection) as a console error.
  const onError = useCallback((error: WalletError) => {
    if (/reject|cancel|not ready|WalletNotReady/i.test(`${error.name} ${error.message}`)) return;
    toast.error(error.message || "Wallet error");
  }, []);
  return (
    <ConnectionProvider endpoint={RPC_URL} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={WALLETS} autoConnect localStorageKey="monthly-wallet" onError={onError}>
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
