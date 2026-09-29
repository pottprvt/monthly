"use client";

import dynamic from "next/dynamic";

import { Card } from "./ui";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

export function ConnectPrompt({ title, text }: { title: string; text: string }) {
  return (
    <Card className="mx-auto max-w-md py-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{text}</p>
      <div className="mt-6 flex justify-center">
        <WalletMultiButton />
      </div>
      <p className="mt-4 text-xs text-muted">Set your wallet to devnet first.</p>
    </Card>
  );
}
