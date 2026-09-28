"use client";

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useMemo } from "react";

import { readProgram, walletProgram } from "./monthly";

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
