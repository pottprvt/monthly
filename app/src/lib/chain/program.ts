import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";

import idl from "@/idl/monthly.json";
import type { Monthly } from "@/idl/monthly";

export type MonthlyProgram = Program<Monthly>;

export const PROGRAM_ID = new PublicKey(idl.address);

/** Read-only client for pages and server code that fetch without a wallet. */
export function readProgram(connection: Connection): MonthlyProgram {
  return new Program<Monthly>(idl as Monthly, { connection });
}

export function walletProgram(connection: Connection, wallet: AnchorWallet): MonthlyProgram {
  return new Program<Monthly>(idl as Monthly, new AnchorProvider(connection, wallet, { commitment: "confirmed" }));
}
