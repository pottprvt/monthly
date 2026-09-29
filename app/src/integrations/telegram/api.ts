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

export async function tg<T = unknown>(method: string, initialParams: Record<string, unknown> = {}): Promise<T> {
  let params = initialParams;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as {
      ok: boolean;
      result?: T;
      description?: string;
      parameters?: { retry_after?: number; migrate_to_chat_id?: number };
    };
    if (data.ok) return data.result as T;
    // A basic group became a supergroup (e.g. when the bot got admin rights): retry on the new id.
    const migrated = data.parameters?.migrate_to_chat_id;
    if (migrated && "chat_id" in params && params.chat_id !== migrated && attempt < 2) {
      params = { ...params, chat_id: migrated };
      continue;
    }
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

/** True when Telegram says the user is not (or no longer) in the chat, i.e. there is nothing to remove. */
export function notAMember(err: unknown): boolean {
  return err instanceof TelegramError && /not found|not a member|participant|user_id_invalid/i.test(err.description);
}

/** Removes a user without a permanent ban, so they can rejoin after paying again. Throws if Telegram refuses. */
export async function removeMember(chatId: number, userId: number) {
  try {
    await tg("banChatMember", { chat_id: chatId, user_id: userId, revoke_messages: false });
  } catch (err) {
    if (notAMember(err)) return;
    throw err;
  }
  await tg("unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true }).catch(() => undefined);
}
