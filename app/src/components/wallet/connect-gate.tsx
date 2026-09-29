"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

import { WalletButton } from "./wallet-button";

/** Renders children only with a connected wallet; otherwise a centered connect prompt. */
export function ConnectGate({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { publicKey } = useWallet();
  // Keyed by wallet so views start fresh (no data of the previous wallet) after switching accounts.
  if (publicKey) return <Fragment key={publicKey.toBase58()}>{children}</Fragment>;
  return (
    <Empty className="min-h-[50vh] border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WalletIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <WalletButton />
        <p className="text-xs text-muted-foreground">Use a wallet set to Solana devnet.</p>
      </EmptyContent>
    </Empty>
  );
}
