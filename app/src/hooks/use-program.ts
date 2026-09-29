"use client";

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

import { readProgram, walletProgram } from "@/lib/chain";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(() => (wallet ? walletProgram(connection, wallet) : readProgram(connection)), [connection, wallet]);
}
