import { createHmac, timingSafeEqual } from "node:crypto";

import { Connection, Keypair } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { RPC_URL } from "@/lib/config";
import { syncAllAccess } from "@/server/access/sync";
import { collectDue } from "@/server/collect";

/** Bearer token for the scheduler, derived from SESSION_SECRET so no extra secret is needed on Vercel. */
function validToken(header: string | null): boolean {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update("monthly-cron").digest("hex"));
  const given = Buffer.from(header.slice(7));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Scheduled job (GitHub Action every 5 minutes): collect all due payments, then reconcile community access. */
export async function POST(req: Request) {
  if (!validToken(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = process.env.FAUCET_KEYPAIR;
  if (!raw) return NextResponse.json({ error: "collector not configured" }, { status: 503 });

  const connection = new Connection(RPC_URL, "confirmed");
  const payments = await collectDue(connection, Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw))), {}, 50);
  const access = await syncAllAccess(connection);
  return NextResponse.json({ payments, access });
}
