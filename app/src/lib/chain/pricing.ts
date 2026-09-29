import type { PlanAccount, SubscriptionAccount } from "./accounts";

export function isPaused(sub: SubscriptionAccount): boolean {
  return "paused" in sub.status;
}

/** What the subscriber pays per period: the lower of agreed and current price (enforced on-chain). */
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

export type MemberStatus = "active" | "due" | "paused";

export function memberStatus(sub: SubscriptionAccount, now: number): MemberStatus {
  if (isPaused(sub)) return "paused";
  return sub.nextChargeAt.toNumber() <= now ? "due" : "active";
}
