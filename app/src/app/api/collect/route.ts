import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { RPC_URL } from "@/lib/config";
import { clientIp } from "@/server/auth/request";
import { collectDue } from "@/server/collect";
import { allow, storeConfigured } from "@/server/store";

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
  if (storeConfigured()) {
    const ok =
      (await allow(`collect:scope:${scopeKey}`, 1, 8)) &&
      (await allow(`collect:ip:${clientIp(req)}`, 20, 60)) &&
      (await allow("collect:all", 120, 60));
    if (!ok) return NextResponse.json({ due: 0, collected: 0, throttled: true });
  }

  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  const result = await collectDue(new Connection(RPC_URL, "confirmed"), payer, scope);
  return NextResponse.json(result);
}
