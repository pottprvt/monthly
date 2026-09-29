import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { fetchPlan, readProgram } from "@/lib/chain";
import { RPC_URL } from "@/lib/config";
import { sessionWallet } from "@/server/auth/request";
import { getGrant, grantsForPlan, storeConfigured } from "@/server/store";

/** Access state per subscription of a plan, for the plan owner's member table. No Telegram identities. */
export async function GET(req: Request) {
  const plan = new URL(req.url).searchParams.get("plan");
  const wallet = await sessionWallet();
  if (!plan || !wallet || !storeConfigured()) return NextResponse.json({});
  let planKey: PublicKey;
  try {
    planKey = new PublicKey(plan);
  } catch {
    return NextResponse.json({});
  }
  const account = await fetchPlan(readProgram(new Connection(RPC_URL, "confirmed")), planKey);
  if (!account || account.merchant.toBase58() !== wallet) return NextResponse.json({});
  const subs = await grantsForPlan(plan);
  const grants = await Promise.all(subs.map((s) => getGrant(s)));
  const states = Object.fromEntries(subs.flatMap((s, i) => (grants[i] ? [[s, grants[i]!.state]] : [])));
  return NextResponse.json(states, { headers: { "Cache-Control": "no-store" } });
}
