import { getAccount, type Account as TokenAccount } from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";

import { AUTHORITY, planPda, usdcAta } from "./pda";
import type { MonthlyProgram } from "./program";

export type PlanAccount = Awaited<ReturnType<MonthlyProgram["account"]["plan"]["fetch"]>>;
export type SubscriptionAccount = Awaited<ReturnType<MonthlyProgram["account"]["subscription"]["fetch"]>>;
export type Keyed<T> = { publicKey: PublicKey; account: T };
export type Plan = Keyed<PlanAccount>;
export type Subscription = Keyed<SubscriptionAccount>;

/** Account sizes (discriminator + INIT_SPACE). Accounts from older program versions have other sizes. */
const PLAN_SIZE = 354;
const SUBSCRIPTION_SIZE = 138;

/** Plan ids are sequential per merchant (1..MAX_PLANS), so all plans load with one multi-account read. */
export const MAX_PLANS = 64;

export async function fetchPlansByMerchant(
  program: MonthlyProgram,
  merchant: PublicKey,
): Promise<{ plans: Plan[]; nextPlanId: number }> {
  const keys = Array.from({ length: MAX_PLANS }, (_, i) => planPda(merchant, i + 1));
  const infos = await program.provider.connection.getMultipleAccountsInfo(keys);
  const plans: Plan[] = [];
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

export async function fetchPlan(program: MonthlyProgram, plan: PublicKey): Promise<PlanAccount | null> {
  const info = await program.provider.connection.getAccountInfo(plan);
  if (!info || info.data.length !== PLAN_SIZE) return null;
  return program.coder.accounts.decode("plan", info.data);
}

export async function fetchPlans(program: MonthlyProgram, keys: PublicKey[]): Promise<(PlanAccount | null)[]> {
  if (keys.length === 0) return [];
  const infos = await program.provider.connection.getMultipleAccountsInfo(keys);
  return infos.map((info) =>
    info && info.data.length === PLAN_SIZE ? program.coder.accounts.decode("plan", info.data) : null,
  );
}

export async function fetchSubscription(
  program: MonthlyProgram,
  subscription: PublicKey,
): Promise<SubscriptionAccount | null> {
  const info = await program.provider.connection.getAccountInfo(subscription);
  if (!info || info.data.length !== SUBSCRIPTION_SIZE) return null;
  return program.coder.accounts.decode("subscription", info.data);
}

export async function fetchSubscriptionsBySubscriber(program: MonthlyProgram, subscriber: PublicKey) {
  return program.account.subscription.all([
    { dataSize: SUBSCRIPTION_SIZE },
    { memcmp: { offset: 8, bytes: subscriber.toBase58() } },
  ]);
}

export async function fetchAllSubscriptions(program: MonthlyProgram) {
  return program.account.subscription.all([{ dataSize: SUBSCRIPTION_SIZE }]);
}

export async function fetchUsdcAccount(connection: Connection, owner: PublicKey): Promise<TokenAccount | null> {
  try {
    return await getAccount(connection, usdcAta(owner));
  } catch {
    return null;
  }
}

/** Spending limit still available to Monthly on this token account. */
export function spendingLimitLeft(acc: TokenAccount | null): bigint {
  if (!acc || !acc.delegate || !acc.delegate.equals(AUTHORITY)) return 0n;
  return acc.delegatedAmount;
}
