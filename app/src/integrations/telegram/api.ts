/** Minimal Telegram Bot API client. Honors retry_after on rate limits. */

export const botUsername = () => process.env.TELEGRAM_BOT_USERNAME ?? "";
export const telegramConfigured = () =>
  !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_BOT_USERNAME && !!process.env.TELEGRAM_WEBHOOK_SECRET;

export class TelegramError extends Error {
  constructor(
    readonly method: string,
    readonly description: string,
  ) {
    super(`${method}: ${description}`);
  }
}

export async function tg<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as { ok: boolean; result?: T; description?: string; parameters?: { retry_after?: number } };
    if (data.ok) return data.result as T;
    const wait = data.parameters?.retry_after;
    if (res.status === 429 && wait && attempt < 2) {
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new TelegramError(method, data.description ?? `HTTP ${res.status}`);
  }
  throw new TelegramError(method, "rate limited");
}

export type ChatMember = { status: string; can_invite_users?: boolean; can_restrict_members?: boolean };

export async function sendMessage(chatId: number, text: string, button?: { text: string; url: string }) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
    ...(button ? { reply_markup: { inline_keyboard: [[button]] } } : {}),
  });
}

/** Removes a user without a permanent ban, so they can rejoin after paying again. */
export async function removeMember(chatId: number, userId: number) {
  await tg("banChatMember", { chat_id: chatId, user_id: userId, revoke_messages: false });
  await tg("unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true }).catch(() => undefined);
}
