import { Connection } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { telegramConfigured } from "@/integrations/telegram/api";
import { RPC_URL } from "@/lib/config";
import { syncPlanAccess, syncSubscriptionAccess } from "@/server/access/sync";
import { clientIp } from "@/server/auth/request";
import { allow, storeConfigured } from "@/server/store";

/**
 * Re-checks community access after a member or creator action (cancel, resume, close plan).
 * Reads state on-chain itself, so it trusts nothing from the request besides which account to check.
 */
export async function POST(req: Request) {
  if (!telegramConfigured() || !storeConfigured()) return NextResponse.json({ revoked: 0, restored: 0 });
  if (!(await allow(`refresh:${clientIp(req)}`, 30, 60))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { subscription, plan } = (await req.json().catch(() => ({}))) as { subscription?: string; plan?: string };
  const connection = new Connection(RPC_URL, "confirmed");
  if (subscription) return NextResponse.json(await syncSubscriptionAccess(connection, subscription));
  if (plan) return NextResponse.json(await syncPlanAccess(connection, plan));
  return NextResponse.json({ error: "subscription or plan required" }, { status: 400 });
}
