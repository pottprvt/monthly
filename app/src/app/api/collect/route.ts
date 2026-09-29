import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { RPC_URL } from "@/lib/config";
import { collectDue } from "@/server/collect";

/** Last run per scope on this instance; keeps open tabs from triggering duplicate work. */
const lastRun = new Map<string, number>();
const MIN_GAP_MS = 8_000;

function key(value: unknown): PublicKey | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return new PublicKey(value);
  } catch {
    return undefined;
  }
}

/** Collects payments that are due now for one plan, subscriber or merchant. */
export async function POST(req: Request) {
  const raw = process.env.FAUCET_KEYPAIR;
  if (!raw) return NextResponse.json({ error: "collector not configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { plan?: unknown; subscriber?: unknown; merchant?: unknown };
  const scope = { plan: key(body.plan), subscriber: key(body.subscriber), merchant: key(body.merchant) };
  if (!scope.plan && !scope.subscriber && !scope.merchant) {
    return NextResponse.json({ error: "plan, subscriber or merchant required" }, { status: 400 });
  }

  const scopeKey = [scope.plan, scope.subscriber, scope.merchant].map((k) => k?.toBase58() ?? "").join(":");
  const last = lastRun.get(scopeKey) ?? 0;
  if (Date.now() - last < MIN_GAP_MS) return NextResponse.json({ due: 0, collected: 0, throttled: true });
  lastRun.set(scopeKey, Date.now());

  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  const result = await collectDue(new Connection(RPC_URL, "confirmed"), payer, scope);
  return NextResponse.json(result);
}
