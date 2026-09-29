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

const PROGRAM_ID = new PublicKey(idl.address);

const AUTHORITY = PublicKey.findProgramAddressSync(
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

/** Account sizes (discriminator + INIT_SPACE). Accounts from older program versions have other sizes. */
const PLAN_SIZE = 354;
const SUBSCRIPTION_SIZE = 138;

/** What the subscriber actually pays per period: the lower of agreed and current price. */
export function effectivePrice(sub: SubscriptionAccount, plan: PlanAccount): bigint {
  const agreed = BigInt(sub.agreedAmount.toString());
  const current = BigInt(plan.amount.toString());
  return agreed < current ? agreed : current;
}

/** A higher plan price the subscriber has not accepted yet, or null. */
export function pendingIncrease(sub: SubscriptionAccount, plan: PlanAccount): bigint | null {
  const current = BigInt(plan.amount.toString());
  return current > BigInt(sub.agreedAmount.toString()) ? current : null;
}

/** Read-only program for pages that fetch without a wallet. */
export function readProgram(connection: Connection): Program<Monthly> {
  return new Program<Monthly>(idl as Monthly, { connection });
}

export function walletProgram(connection: Connection, wallet: AnchorWallet): Program<Monthly> {
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program<Monthly>(idl as Monthly, provider);
}

/** Plans use sequential ids per merchant, so they load with one cheap multi-account read. */
export const MAX_PLANS = 64;

export async function fetchPlansByMerchant(
  program: Program<Monthly>,
  merchant: PublicKey,
): Promise<{ plans: Keyed<PlanAccount>[]; nextPlanId: number }> {
  const keys = Array.from({ length: MAX_PLANS }, (_, i) => planPda(merchant, new BN(i + 1)));
  const infos = await program.provider.connection.getMultipleAccountsInfo(keys);
  const plans: Keyed<PlanAccount>[] = [];
  let nextPlanId = 0;
  infos.forEach((info, i) => {
    if (!info) {
      if (nextPlanId === 0) nextPlanId = i + 1;
    } else if (info.data.length === PLAN_SIZE) {
      plans.push({ publicKey: keys[i], account: program.coder.accounts.decode("plan", info.data) });
    }
  });
  return { plans, nextPlanId };
}

export async function fetchSubscriptionsBySubscriber(
  program: Program<Monthly>,
  subscriber: PublicKey,
) {
  return program.account.subscription.all([
    { dataSize: SUBSCRIPTION_SIZE },
    { memcmp: { offset: 8, bytes: subscriber.toBase58() } },
  ]);
}

export async function fetchAllSubscriptions(program: Program<Monthly>) {
  return program.account.subscription.all([{ dataSize: SUBSCRIPTION_SIZE }]);
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
  image: string,
  amount: BN,
  intervalSeconds: BN,
): Promise<TransactionInstruction> {
  return program.methods
    .createPlan(planId, name, image, amount, intervalSeconds)
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

export async function updatePlanIx(
  program: Program<Monthly>,
  merchant: PublicKey,
  plan: PublicKey,
  name: string,
  image: string,
  amount: BN,
): Promise<TransactionInstruction> {
  return program.methods.updatePlan(name, image, amount).accountsPartial({ merchant, plan }).instruction();
}

export async function acceptPriceIx(
  program: Program<Monthly>,
  subscriber: PublicKey,
  plan: PublicKey,
  subscription: PublicKey,
): Promise<TransactionInstruction> {
  return program.methods.acceptPrice().accountsPartial({ subscriber, plan, subscription }).instruction();
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
