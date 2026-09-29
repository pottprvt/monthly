import { randomBytes } from "node:crypto";

import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { connectUrl } from "@/integrations/telegram/bot";
import { fetchPlan, readProgram } from "@/lib/chain";
import { RPC_URL } from "@/lib/config";
import { sessionWallet } from "@/server/auth/request";
import { putCode } from "@/server/store";

/** Creator: returns a one-time link that adds the bot to a group and binds it to the plan. */
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
  const account = await fetchPlan(readProgram(new Connection(RPC_URL, "confirmed")), planKey);
  if (!account || !account.active) return NextResponse.json({ error: "Plan not found or closed" }, { status: 404 });
  if (account.merchant.toBase58() !== wallet) return NextResponse.json({ error: "Only the plan owner can connect a group" }, { status: 403 });

  const code = randomBytes(16).toString("base64url");
  await putCode(code, { kind: "connect", plan: planKey.toBase58(), wallet });
  return NextResponse.json({ url: connectUrl(code) });
}
