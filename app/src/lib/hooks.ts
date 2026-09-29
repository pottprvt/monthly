"use client";

import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { TransactionInstruction } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { readProgram, toTx, walletProgram } from "./monthly";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(
    () => (wallet ? walletProgram(connection, wallet) : readProgram(connection)),
    [connection, wallet],
  );
}

/** Runs `load` on mount and whenever it changes, optionally on an interval. */
export function usePoll(load: () => Promise<void>, intervalMs?: number) {
  useEffect(() => {
    let active = true;
    const run = () => {
      if (active) void load();
    };
    run();
    if (!intervalMs) {
      return () => {
        active = false;
      };
    }
    const t = window.setInterval(run, intervalMs);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, [load, intervalMs]);
}

export type TxResult = { ok: boolean; text: string; sig?: string };

/** Signs and sends one transaction built from instructions, tracking busy state and the outcome. */
export function useTx(onDone?: () => Promise<void> | void) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<TxResult | null>(null);

  const run = useCallback(
    async (label: string, build: () => Promise<TransactionInstruction[]>, success?: string) => {
      if (!publicKey) return;
      setBusy(label);
      setResult(null);
      try {
        const ixs = await build();
        const sig = await sendTransaction(toTx(ixs, publicKey), connection);
        await connection.confirmTransaction(sig, "confirmed");
        setResult({ ok: true, text: success ?? `${label}: done.`, sig });
        await onDone?.();
      } catch (err) {
        setResult({ ok: false, text: friendlyError(err) });
      } finally {
        setBusy(null);
      }
    },
    [publicKey, sendTransaction, connection, onDone],
  );

  return { busy, result, run, clear: () => setResult(null) };
}

function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  if (/User rejected|rejected the request/i.test(msg)) return "You rejected the request in your wallet.";
  const anchor = msg.match(/Error Message: ([^.]+)\./);
  if (anchor) return anchor[1];
  return msg.split("\n")[0];
}
