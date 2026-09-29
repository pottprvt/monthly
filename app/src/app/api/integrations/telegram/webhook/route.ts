import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { sendMessage } from "@/integrations/telegram/api";
import { handleUpdate, type Update } from "@/integrations/telegram/bot";
import { forgetSeen } from "@/server/store";

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
    console.error("telegram update failed", update.update_id, err);
    if (update.message) {
      // Commands: tell the chat and do not retry (the user can simply try again from Monthly).
      await sendMessage(update.message.chat.id, "Something went wrong. Please try again from Monthly.").catch(() => undefined);
    } else {
      // Join requests and membership changes must not be lost: let Telegram deliver them again.
      await forgetSeen(update.update_id).catch(() => undefined);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
