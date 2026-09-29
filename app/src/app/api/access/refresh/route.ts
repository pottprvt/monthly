import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { telegramConfigured } from "@/integrations/telegram/api";
import { fetchPlan, readProgram, subscriptionPda } from "@/lib/chain";
import { RPC_URL } from "@/lib/config";
import { syncPlanAccess, syncSubscriptionAccess } from "@/server/access/sync";
import { clientIp, sameOrigin, sessionWallet } from "@/server/auth/request";
import { allow, getGrant, storeConfigured } from "@/server/store";

/**
 * Re-checks community access right after a member action (cancel, resume) or a creator action
 * (close plan). Only the member of that subscription or the owner of that plan may trigger it;
 * the state itself is always read on-chain.
 */
export async function POST(req: Request) {
  if (!telegramConfigured() || !storeConfigured()) return NextResponse.json({ revoked: 0, restored: 0 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const wallet = await sessionWallet();
  if (!wallet) return NextResponse.json({ error: "Sign in with your wallet first" }, { status: 401 });
  if (!(await allow(`refresh:${clientIp(req)}`, 20, 60))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { subscription, plan } = (await req.json().catch(() => ({}))) as { subscription?: string; plan?: string };
  const connection = new Connection(RPC_URL, "confirmed");
  try {
    if (subscription) {
      const grant = await getGrant(subscription);
      if (!grant) return NextResponse.json({ revoked: 0, restored: 0 });
      const own = subscriptionPda(new PublicKey(grant.plan), new PublicKey(wallet)).toBase58() === subscription;
      if (!own) return NextResponse.json({ error: "Not your subscription" }, { status: 403 });
      return NextResponse.json(await syncSubscriptionAccess(connection, subscription));
    }
    if (plan) {
      const account = await fetchPlan(readProgram(connection), new PublicKey(plan));
      if (!account || account.merchant.toBase58() !== wallet) return NextResponse.json({ error: "Not your plan" }, { status: 403 });
      return NextResponse.json(await syncPlanAccess(connection, plan));
    }
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  return NextResponse.json({ error: "subscription or plan required" }, { status: 400 });
}
