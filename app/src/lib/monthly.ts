import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import {
  createApproveInstruction,
  createRevokeInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  type Account as TokenAccount,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import idl from "@/idl/monthly.json";
import type { Monthly } from "@/idl/monthly";
import { USDC_MINT } from "./config";

export const PROGRAM_ID = new PublicKey(idl.address);

export const AUTHORITY = PublicKey.findProgramAddressSync(
  [Buffer.from("authority")],
  PROGRAM_ID,
)[0];

export function planPda(merchant: PublicKey, planId: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("plan"), merchant.toBuffer(), planId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  )[0];
}

export function subscriptionPda(plan: PublicKey, subscriber: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("subscription"), plan.toBuffer(), subscriber.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export type PlanAccount = Awaited<ReturnType<Program<Monthly>["account"]["plan"]["fetch"]>>;
export type SubscriptionAccount = Awaited<
  ReturnType<Program<Monthly>["account"]["subscription"]["fetch"]>
>;
export type Keyed<T> = { publicKey: PublicKey; account: T };

export function isPaused(sub: SubscriptionAccount): boolean {
  return "paused" in sub.status;
}

/** Read-only program for pages that fetch without a wallet. */
export function readProgram(connection: Connection): Program<Monthly> {
  return new Program<Monthly>(idl as Monthly, { connection });
}

export function walletProgram(connection: Connection, wallet: AnchorWallet): Program<Monthly> {
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program<Monthly>(idl as Monthly, provider);
}

export async function fetchPlansByMerchant(program: Program<Monthly>, merchant: PublicKey) {
  return program.account.plan.all([{ memcmp: { offset: 8, bytes: merchant.toBase58() } }]);
}

export async function fetchSubscriptionsBySubscriber(
  program: Program<Monthly>,
  subscriber: PublicKey,
) {
  return program.account.subscription.all([
    { memcmp: { offset: 8, bytes: subscriber.toBase58() } },
  ]);
}

export async function fetchSubscriptionsByPlan(program: Program<Monthly>, plan: PublicKey) {
  return program.account.subscription.all([{ memcmp: { offset: 40, bytes: plan.toBase58() } }]);
}

export async function fetchAllActiveSubscriptions(program: Program<Monthly>) {
  return program.account.subscription.all();
}

export function usdcAta(owner: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(USDC_MINT, owner);
}

export async function fetchUsdcAccount(
  connection: Connection,
  owner: PublicKey,
): Promise<TokenAccount | null> {
  try {
    return await getAccount(connection, usdcAta(owner));
  } catch {
    return null;
  }
}

/** Allowance still available to Monthly on this token account. */
export function mandateRemaining(acc: TokenAccount | null): bigint {
  if (!acc || !acc.delegate || !acc.delegate.equals(AUTHORITY)) return 0n;
  return acc.delegatedAmount;
}

export async function createPlanIx(
  program: Program<Monthly>,
  merchant: PublicKey,
  planId: BN,
  name: string,
  amount: BN,
  intervalSeconds: BN,
): Promise<TransactionInstruction> {
  return program.methods
    .createPlan(planId, name, amount, intervalSeconds)
    .accountsPartial({
      merchant,
      plan: planPda(merchant, planId),
      mint: USDC_MINT,
      merchantTokenAccount: usdcAta(merchant),
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Approve (or top up) the mandate and subscribe in one transaction.
 * `allowance` is the total the program may pull from now on, in base units.
 */
export async function subscribeIxs(
  program: Program<Monthly>,
  subscriber: PublicKey,
  plan: PublicKey,
  planAccount: PlanAccount,
  allowance: bigint,
): Promise<TransactionInstruction[]> {
  const source = usdcAta(subscriber);
  const approve = createApproveInstruction(source, AUTHORITY, subscriber, allowance);
  const subscribe = await program.methods
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
    .instruction();
  return [approve, subscribe];
}

export async function chargeIx(
  program: Program<Monthly>,
  payer: PublicKey,
  plan: Keyed<PlanAccount>,
  sub: Keyed<SubscriptionAccount>,
): Promise<TransactionInstruction> {
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

export async function resumeIx(
  program: Program<Monthly>,
  subscriber: PublicKey,
  plan: Keyed<PlanAccount>,
  sub: Keyed<SubscriptionAccount>,
): Promise<TransactionInstruction> {
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

export async function cancelIx(
  program: Program<Monthly>,
  subscriber: PublicKey,
  plan: PublicKey,
  subscription: PublicKey,
): Promise<TransactionInstruction> {
  return program.methods
    .cancel()
    .accountsPartial({ subscriber, plan, subscription })
    .instruction();
}

export async function closePlanIx(
  program: Program<Monthly>,
  merchant: PublicKey,
  plan: PublicKey,
): Promise<TransactionInstruction> {
  return program.methods.closePlan().accountsPartial({ merchant, plan }).instruction();
}

export function revokeMandateIx(subscriber: PublicKey): TransactionInstruction {
  return createRevokeInstruction(usdcAta(subscriber), subscriber);
}

export function toTx(ixs: TransactionInstruction[], feePayer: PublicKey): Transaction {
  const tx = new Transaction();
  tx.add(...ixs);
  tx.feePayer = feePayer;
  return tx;
}
