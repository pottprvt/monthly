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
    async (
      label: string,
      build: () => Promise<TransactionInstruction[]>,
      success: string,
      options: { refresh?: boolean } = {},
    ): Promise<boolean> => {
      if (!publicKey) return false;
      setBusy(label);
      try {
        const tx = toTx(await build(), publicKey);
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        const sig = await sendTransaction(tx, connection);
        const confirmation = await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
        if (confirmation.value.err) throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
        toast.success(success, {
          action: { label: "View", onClick: () => window.open(explorerTx(sig), "_blank") },
        });
        if (options.refresh !== false) {
          requestRefresh();
          // Devnet RPC nodes can lag a moment behind the confirmation; read again shortly after.
          window.setTimeout(requestRefresh, 2_000);
        }
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
