import { NextResponse } from "next/server";

import { telegramConfigured } from "@/integrations/telegram/api";
import { getTelegramConnection, storeConfigured } from "@/server/store";

/** Whether a plan has a Telegram group connected (public: shows only the group title). */
export async function GET(req: Request) {
  const plan = new URL(req.url).searchParams.get("plan");
  if (!plan || !telegramConfigured() || !storeConfigured()) {
    return NextResponse.json({ status: "not_configured" }, { headers: { "Cache-Control": "no-store" } });
  }
  const conn = await getTelegramConnection(plan);
  return NextResponse.json(
    conn ? { status: conn.status, title: conn.title, error: conn.error } : { status: "needs_setup" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
