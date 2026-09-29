import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { telegramConfigured } from "@/integrations/telegram/api";
import { fetchPlan, readProgram } from "@/lib/chain";
import { RPC_URL } from "@/lib/config";
import { connectionIsCurrent, getTelegramConnection, storeConfigured } from "@/server/store";

/** Whether a plan has a Telegram group connected (public: shows only the group title). */
export async function GET(req: Request) {
  const plan = new URL(req.url).searchParams.get("plan");
  if (!plan || !telegramConfigured() || !storeConfigured()) {
    return NextResponse.json({ status: "not_configured" }, { headers: { "Cache-Control": "no-store" } });
  }
  let planKey: PublicKey;
  try {
    planKey = new PublicKey(plan);
  } catch {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }
  const [conn, account] = await Promise.all([
    getTelegramConnection(plan),
    fetchPlan(readProgram(new Connection(RPC_URL, "confirmed")), planKey),
  ]);
  const current = conn && account && connectionIsCurrent(conn, account.createdAt.toNumber());
  return NextResponse.json(
    current ? { status: conn.status, title: conn.title, error: conn.error } : { status: "needs_setup" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
