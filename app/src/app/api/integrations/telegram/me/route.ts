import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { subscriptionPda } from "@/lib/chain";
import { sessionWallet } from "@/server/auth/request";
import { getGrant, storeConfigured } from "@/server/store";

/** The signed-in member's own access state for a plan: none, pending, granted or revoked. */
export async function GET(req: Request) {
  const plan = new URL(req.url).searchParams.get("plan");
  const wallet = await sessionWallet();
  if (!plan || !wallet || !storeConfigured()) return NextResponse.json({ state: null }, { headers: { "Cache-Control": "no-store" } });
  try {
    const grant = await getGrant(subscriptionPda(new PublicKey(plan), new PublicKey(wallet)).toBase58());
    return NextResponse.json({ state: grant?.state ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ state: null });
  }
}
