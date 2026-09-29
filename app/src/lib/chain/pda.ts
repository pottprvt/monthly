import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

import { USDC_MINT } from "@/lib/config";

import { PROGRAM_ID } from "./program";

/** Program-owned delegate that subscribers approve on their token account (the spending limit). */
export const AUTHORITY = PublicKey.findProgramAddressSync([Buffer.from("authority")], PROGRAM_ID)[0];

export function planPda(merchant: PublicKey, planId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("plan"), merchant.toBuffer(), new BN(planId).toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  )[0];
}

export function subscriptionPda(plan: PublicKey, subscriber: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("subscription"), plan.toBuffer(), subscriber.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export function usdcAta(owner: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(USDC_MINT, owner);
}
