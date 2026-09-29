/**
 * Reconciles Telegram group membership with on-chain subscription state.
 * Desired access: the subscription account exists, is not paused, and its plan is active.
 * Idempotent; safe to call from the charge job, after member actions, or repeatedly.
 */
import { Connection, PublicKey } from "@solana/web3.js";

import { fetchPlan, isPaused, readProgram, type MonthlyProgram } from "@/lib/chain";
import { removeMember, sendMessage, telegramConfigured } from "@/integrations/telegram/api";
import { getGrant, getTelegramConnection, grantsForPlan, setGrant, storeConfigured, telegramPlans } from "@/server/store";

const SUBSCRIPTION_SIZE = 138;

async function subscriptionActive(program: MonthlyProgram, subscription: string): Promise<boolean> {
  const info = await program.provider.connection.getAccountInfo(new PublicKey(subscription));
  if (!info || info.data.length !== SUBSCRIPTION_SIZE) return false;
  return !isPaused(program.coder.accounts.decode("subscription", info.data));
}

export type SyncResult = { revoked: number; restored: number };

export async function syncPlanAccess(connection: Connection, plan: string, only?: string[]): Promise<SyncResult> {
  const result = { revoked: 0, restored: 0 };
  const conn = await getTelegramConnection(plan);
  if (!conn || conn.status !== "connected") return result;
  const program = readProgram(connection);
  const planAccount = await fetchPlan(program, new PublicKey(plan));
  const subs = only ?? (await grantsForPlan(plan));

  for (const subscription of subs) {
    const grant = await getGrant(subscription);
    if (!grant || grant.plan !== plan) continue;
    const desired = !!planAccount?.active && (await subscriptionActive(program, subscription));

    if (!desired && grant.state !== "revoked") {
      if (grant.state === "granted") await removeMember(conn.chatId, grant.userId).catch(() => undefined);
      await setGrant(subscription, { ...grant, state: "revoked", updatedAt: Date.now() });
      await sendMessage(grant.userId, `Your subscription ended, so your access to ${conn.title} was removed. Subscribe again any time to rejoin.`).catch(() => undefined);
      result.revoked++;
    } else if (desired && grant.state === "revoked") {
      await setGrant(subscription, { ...grant, state: "pending", updatedAt: Date.now() });
      await sendMessage(grant.userId, `Welcome back. Your subscription is active again.`, {
        text: `Join ${conn.title}`,
        url: conn.inviteLink,
      }).catch(() => undefined);
      result.restored++;
    }
  }
  return result;
}

export async function syncSubscriptionAccess(connection: Connection, subscription: string): Promise<SyncResult> {
  const grant = await getGrant(subscription);
  if (!grant) return { revoked: 0, restored: 0 };
  return syncPlanAccess(connection, grant.plan, [subscription]);
}

export async function syncAllAccess(connection: Connection): Promise<SyncResult> {
  const total = { revoked: 0, restored: 0 };
  if (!storeConfigured() || !telegramConfigured()) return total;
  for (const plan of await telegramPlans()) {
    const r = await syncPlanAccess(connection, plan);
    total.revoked += r.revoked;
    total.restored += r.restored;
  }
  return total;
}
