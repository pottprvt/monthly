"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

export function FaucetButton({ onFunded, variant = "nav" }: { onFunded?: () => void; variant?: "nav" | "inline" }) {
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
      const data = (await res.json()) as { signature?: string; error?: string };
      if (!res.ok || !data.signature) throw new Error(data.error ?? "request failed");
      setState("done");
      if (onFunded) onFunded();
      else setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setState("error");
      setMessage((err as Error).message);
    }
  }

  const label = state === "busy" ? "Sending…" : state === "done" ? "Funds sent ✓" : "Get test funds";
  const cls =
    variant === "nav"
      ? "rounded-lg border border-line bg-panel px-3 py-2 text-sm hover:bg-panel-strong"
      : "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong";

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={request}
        disabled={state === "busy"}
        className={`${cls} disabled:opacity-50`}
        title="100 test USDC, plus 0.05 devnet SOL for fees if your wallet is empty"
      >
        {label}
      </button>
      {state === "error" && <span className="text-xs text-danger">{message}</span>}
    </span>
  );
}
