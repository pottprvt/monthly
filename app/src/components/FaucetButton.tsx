"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

import { explorerTx } from "@/lib/config";

export function FaucetButton() {
  const { publicKey } = useWallet();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!publicKey) return null;

  async function request() {
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: publicKey!.toBase58() }),
      });
      const data = (await res.json()) as { signature?: string; sol?: number; error?: string };
      if (!res.ok || !data.signature) throw new Error(data.error ?? "request failed");
      setState("done");
      setMessage(explorerTx(data.signature));
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setState("error");
      setMessage((err as Error).message);
    }
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <button
        onClick={request}
        disabled={state === "busy"}
        className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-panel-strong disabled:opacity-50"
        title="Sends 100 test USDC and, if your wallet is empty, 0.05 devnet SOL for fees"
      >
        {state === "busy" ? "Sending…" : state === "done" ? "Funds sent" : "Get test funds"}
      </button>
      {state === "error" && <span className="text-danger">{message}</span>}
    </span>
  );
}
