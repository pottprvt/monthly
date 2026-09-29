"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";

/**
 * Makes sure the server has a signed-in session for the connected wallet. Asks the wallet to sign
 * a short message (free, no transaction) only when there is no valid session for this wallet yet.
 */
export function useWalletSession() {
  const { publicKey, signMessage } = useWallet();

  return useCallback(async (): Promise<void> => {
    if (!publicKey) throw new Error("Connect your wallet first");
    const wallet = publicKey.toBase58();
    const current = (await (await fetch("/api/auth/session")).json()) as { wallet: string | null };
    if (current.wallet === wallet) return;
    if (!signMessage) throw new Error("This wallet cannot sign messages");

    const nonceRes = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    const { nonce, message, error } = (await nonceRes.json()) as { nonce?: string; message?: string; error?: string };
    if (!nonce || !message) throw new Error(error ?? "Could not start sign-in");

    const signature = await signMessage(new TextEncoder().encode(message));
    const verify = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, nonce, signature: Buffer.from(signature).toString("base64") }),
    });
    if (!verify.ok) throw new Error(((await verify.json()) as { error?: string }).error ?? "Sign-in failed");
  }, [publicKey, signMessage]);
}
