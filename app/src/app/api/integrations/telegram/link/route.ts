import { randomBytes } from "node:crypto";

import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { memberUrl } from "@/integrations/telegram/bot";
import { fetchPlan, fetchSubscription, isPaused, readProgram, subscriptionPda } from "@/lib/chain";
import { RPC_URL } from "@/lib/config";
import { sessionWallet } from "@/server/auth/request";
import { putCode } from "@/server/store";

/** Member: returns a one-time link to the bot that binds their Telegram account to their wallet. */
export async function POST(req: Request) {
  const wallet = await sessionWallet();
  if (!wallet) return NextResponse.json({ error: "Sign in with your wallet first" }, { status: 401 });
  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  let planKey: PublicKey;
  try {
    planKey = new PublicKey(plan ?? "");
  } catch {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }
  const program = readProgram(new Connection(RPC_URL, "confirmed"));
  const subscription = subscriptionPda(planKey, new PublicKey(wallet));
  const [planAccount, sub] = await Promise.all([fetchPlan(program, planKey), fetchSubscription(program, subscription)]);
  if (!planAccount?.active || !sub || isPaused(sub)) {
    return NextResponse.json({ error: "No active subscription for this plan" }, { status: 403 });
  }
  const code = randomBytes(16).toString("base64url");
  await putCode(code, { kind: "member", plan: planKey.toBase58(), wallet, subscription: subscription.toBase58() });
  return NextResponse.json({ url: memberUrl(code) });
}
