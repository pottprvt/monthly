import { BN } from "@coral-xyz/anchor";
import { createApproveInstruction, createRevokeInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

import { USDC_MINT } from "@/lib/config";

import type { Plan, PlanAccount, Subscription } from "./accounts";
import { AUTHORITY, planPda, subscriptionPda, usdcAta } from "./pda";
import type { MonthlyProgram } from "./program";

export type PlanListing = { name: string; image: string; amount: bigint };

export async function createPlanIx(
  program: MonthlyProgram,
  merchant: PublicKey,
  planId: number,
  listing: PlanListing,
  intervalSeconds: number,
): Promise<TransactionInstruction> {
  return program.methods
    .createPlan(new BN(planId), listing.name, listing.image, new BN(listing.amount.toString()), new BN(intervalSeconds))
    .accountsPartial({
      merchant,
      plan: planPda(merchant, planId),
      mint: USDC_MINT,
      merchantTokenAccount: usdcAta(merchant),
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function updatePlanIx(
  program: MonthlyProgram,
  merchant: PublicKey,
  plan: PublicKey,
  listing: PlanListing,
): Promise<TransactionInstruction> {
  return program.methods
    .updatePlan(listing.name, listing.image, new BN(listing.amount.toString()))
    .accountsPartial({ merchant, plan })
    .instruction();
}

export async function closePlanIx(program: MonthlyProgram, merchant: PublicKey, plan: PublicKey) {
  return program.methods.closePlan().accountsPartial({ merchant, plan }).instruction();
}

/** Sets the spending limit (approve) and subscribes in one transaction. `limit` is the total the program may pull. */
export async function subscribeIxs(
  program: MonthlyProgram,
  subscriber: PublicKey,
  plan: PublicKey,
  planAccount: PlanAccount,
  limit: bigint,
): Promise<TransactionInstruction[]> {
  const source = usdcAta(subscriber);
  return [
    createApproveInstruction(source, AUTHORITY, subscriber, limit),
    await program.methods
      .subscribe()
      .accountsPartial({
        subscriber,
        plan,
        subscription: subscriptionPda(plan, subscriber),
        subscriberTokenAccount: source,
        merchantTokenAccount: planAccount.merchantTokenAccount,
        authority: AUTHORITY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),
  ];
}

/** Raises the spending limit to `limit` without touching any subscription. */
export function setSpendingLimitIx(subscriber: PublicKey, limit: bigint): TransactionInstruction {
  return createApproveInstruction(usdcAta(subscriber), AUTHORITY, subscriber, limit);
}

export function revokeSpendingLimitIx(subscriber: PublicKey): TransactionInstruction {
  return createRevokeInstruction(usdcAta(subscriber), subscriber);
}

export async function chargeIx(program: MonthlyProgram, payer: PublicKey, plan: Plan, sub: Subscription) {
  return program.methods
    .charge()
    .accountsPartial({
      payer,
      plan: plan.publicKey,
      subscription: sub.publicKey,
      subscriberTokenAccount: sub.account.subscriberTokenAccount,
      merchantTokenAccount: plan.account.merchantTokenAccount,
      authority: AUTHORITY,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

export async function resumeIx(program: MonthlyProgram, subscriber: PublicKey, plan: Plan, sub: Subscription) {
  return program.methods
    .resume()
    .accountsPartial({
      subscriber,
      plan: plan.publicKey,
      subscription: sub.publicKey,
      subscriberTokenAccount: sub.account.subscriberTokenAccount,
      merchantTokenAccount: plan.account.merchantTokenAccount,
      authority: AUTHORITY,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

export async function cancelIx(program: MonthlyProgram, subscriber: PublicKey, plan: PublicKey, subscription: PublicKey) {
  return program.methods.cancel().accountsPartial({ subscriber, plan, subscription }).instruction();
}

export async function acceptPriceIx(
  program: MonthlyProgram,
  subscriber: PublicKey,
  plan: PublicKey,
  subscription: PublicKey,
) {
  return program.methods.acceptPrice().accountsPartial({ subscriber, plan, subscription }).instruction();
}

export function toTx(ixs: TransactionInstruction[], feePayer: PublicKey): Transaction {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = feePayer;
  return tx;
}
