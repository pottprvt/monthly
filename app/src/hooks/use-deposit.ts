"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

const cache = new Map<number, number>();

/**
 * Solana's refundable storage deposit (rent exemption) for an account of `bytes`, read from the
 * network because the rate can change. Null until loaded.
 */
export function useDeposit(bytes: number): number | null {
  const { connection } = useConnection();
  const [lamports, setLamports] = useState<number | null>(cache.get(bytes) ?? null);
  useEffect(() => {
    if (cache.has(bytes)) return;
    let active = true;
    connection
      .getMinimumBalanceForRentExemption(bytes)
      .then((value) => {
        cache.set(bytes, value);
        if (active) setLamports(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [bytes, connection]);
  return lamports;
}
