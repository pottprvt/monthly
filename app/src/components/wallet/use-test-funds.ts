"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { toast } from "sonner";

import { requestRefresh } from "@/hooks/use-poll";

/** Devnet only: asks the server faucet for 100 test USDC (plus a little SOL for fees if the wallet is empty). */
export function useTestFunds() {
  const { publicKey } = useWallet();
  const [busy, setBusy] = useState(false);

  async function request() {
    if (!publicKey) return;
    setBusy(true);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: publicKey.toBase58() }),
      });
      const data = (await res.json()) as { signature?: string; error?: string };
      if (!res.ok || !data.signature) throw new Error(data.error ?? "Request failed");
      toast.success("100 test USDC sent to your wallet");
      requestRefresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return { request, busy };
}
