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

const REFRESH_EVENT = "monthly:refresh";

/** Asks every mounted page to reload its data, e.g. after test funds arrived. */
export function requestRefresh() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

/** Retries RPC reads that the public devnet endpoint rejects under load. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 800 * 2 ** i));
    }
  }
  throw last;
}

/**
 * Runs `load` on mount, on refresh requests and on an interval while the tab is visible.
 * Returns an error flag that is set while the last attempt failed; previous data stays on screen.
 */
export function usePoll(load: () => Promise<void>, intervalMs = 20_000) {
  const [failing, setFailing] = useState(false);
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active || document.hidden) return;
      try {
        await withRetry(load);
        if (active) setFailing(false);
      } catch {
        if (active) setFailing(true);
      }
    };
    void run();
    const t = window.setInterval(run, intervalMs);
    window.addEventListener(REFRESH_EVENT, run);
    document.addEventListener("visibilitychange", run);
    return () => {
      active = false;
      window.clearInterval(t);
      window.removeEventListener(REFRESH_EVENT, run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [load, intervalMs]);
  return failing;
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
        await withRetry(async () => onDone?.());
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
