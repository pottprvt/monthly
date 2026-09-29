import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { handleUpdate, type Update } from "@/integrations/telegram/bot";

function validSecret(given: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Telegram webhook. Authenticated by the secret token set via setWebhook. */
export async function POST(req: Request) {
  if (!validSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const update = (await req.json()) as Update;
  try {
    await handleUpdate(update, new URL(req.url).origin);
  } catch (err) {
    // Acknowledge anyway so Telegram does not retry a failing update forever; the error is logged.
    console.error("telegram update failed", update.update_id, err);
  }
  return NextResponse.json({ ok: true });
}
