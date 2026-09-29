import { NextResponse } from "next/server";

import { getGrant, grantsForPlan, storeConfigured } from "@/server/store";

/** Access state per subscription of a plan, for the creator's member table. No Telegram identities. */
export async function GET(req: Request) {
  const plan = new URL(req.url).searchParams.get("plan");
  if (!plan || !storeConfigured()) return NextResponse.json({});
  const subs = await grantsForPlan(plan);
  const grants = await Promise.all(subs.map((s) => getGrant(s)));
  const states = Object.fromEntries(subs.flatMap((s, i) => (grants[i] ? [[s, grants[i]!.state]] : [])));
  return NextResponse.json(states, { headers: { "Cache-Control": "no-store" } });
}
