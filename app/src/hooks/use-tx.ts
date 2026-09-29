"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { TransactionInstruction } from "@solana/web3.js";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { toTx } from "@/lib/chain";
import { explorerTx } from "@/lib/config";

import { requestRefresh } from "./use-poll";

/**
 * Signs and sends one transaction, shows the outcome as a toast and refreshes all views.
 * Returns true on success so callers can move on (close a dialog, advance a step).
 */
export function useTx() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    async (label: string, build: () => Promise<TransactionInstruction[]>, success: string): Promise<boolean> => {
      if (!publicKey) return false;
      setBusy(label);
      try {
        const sig = await sendTransaction(toTx(await build(), publicKey), connection);
        await connection.confirmTransaction(sig, "confirmed");
        toast.success(success, {
          action: { label: "View", onClick: () => window.open(explorerTx(sig), "_blank") },
        });
        requestRefresh();
        return true;
      } catch (err) {
        toast.error(friendlyError(err));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [publicKey, sendTransaction, connection],
  );

  return { busy, run };
}

function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  if (/User rejected|rejected the request/i.test(msg)) return "You cancelled the request in your wallet.";
  const anchor = msg.match(/Error Message: ([^.]+)\./);
  if (anchor) return anchor[1];
  if (/insufficient/i.test(msg)) return "Not enough funds for this transaction.";
  return msg.split("\n")[0];
}
