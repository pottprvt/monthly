/**
 * Telegram bot logic. Handles:
 * - creator adds the bot to a group via a one-time connect link   → group bound to a plan
 * - member opens the bot via a one-time link from Monthly           → Telegram account bound to a wallet
 * - join requests to the plan's group                               → approved only for active subscribers
 * - bot removed or demoted                                          → connection marked as error
 */
import { Connection, PublicKey } from "@solana/web3.js";

import { fetchPlan, fetchSubscription, isPaused, readProgram, subscriptionPda } from "@/lib/chain";
import { RPC_URL } from "@/lib/config";
import {
  clearGrants,
  connectionIsCurrent,
  firstSeen,
  getGrant,
  getTelegramConnection,
  linkTelegramAccount,
  peekCode,
  planForChat,
  setGrant,
  setTelegramConnection,
  takeCode,
  unlinkTelegramAccount,
  walletForTelegram,
  type LinkCode,
} from "@/server/store";

import { botUsername, removeMember, sendMessage, tg, type ChatMember } from "./api";

type User = { id: number; first_name?: string; username?: string };
type Chat = { id: number; type: "private" | "group" | "supergroup" | "channel"; title?: string };
type Message = { from?: User; chat: Chat; text?: string; migrate_to_chat_id?: number };
type JoinRequest = { chat: Chat; from: User; user_chat_id: number };
type MemberUpdate = { chat: Chat; new_chat_member: ChatMember & { user: User } };
export type Update = { update_id: number; message?: Message; chat_join_request?: JoinRequest; my_chat_member?: MemberUpdate };

const program = () => readProgram(new Connection(RPC_URL, "confirmed"));
let botId: number | null = null;
async function getBotId(): Promise<number> {
  botId ??= (await tg<{ id: number }>("getMe")).id;
  return botId;
}

const short = (wallet: string) => `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;

/** Active subscription to the plan that this group is currently connected to. */
async function activeSubscriber(plan: string, wallet: string, chatId: number): Promise<boolean> {
  const p = program();
  const planKey = new PublicKey(plan);
  const [planAccount, sub, conn] = await Promise.all([
    fetchPlan(p, planKey),
    fetchSubscription(p, subscriptionPda(planKey, new PublicKey(wallet))),
    getTelegramConnection(plan),
  ]);
  if (!planAccount?.active || !conn || conn.chatId !== chatId) return false;
  if (!connectionIsCurrent(conn, planAccount.createdAt.toNumber())) return false;
  return !!sub && !isPaused(sub);
}

export async function handleUpdate(update: Update, origin: string): Promise<void> {
  if (!(await firstSeen(update.update_id))) return;
  if (update.message) return handleMessage(update.message, origin);
  if (update.chat_join_request) return handleJoinRequest(update.chat_join_request, origin);
  if (update.my_chat_member) return handleBotMembership(update.my_chat_member);
}

async function handleMessage(msg: Message, origin: string) {
  if (msg.migrate_to_chat_id) return migrateGroup(msg.chat.id, msg.migrate_to_chat_id);
  const text = msg.text ?? "";
  if (!msg.from || !/^\/start(@\w+)?(\s|$)/.test(text)) return;
  const payload = text.split(/\s+/)[1];
  // Look before consuming: a member link opened in a group (or vice versa) must stay usable.
  const peeked = payload ? await peekCode(payload) : null;

  if (msg.chat.type === "private") {
    if (peeked?.kind === "member") {
      const code = await takeCode(payload!);
      if (code?.kind === "member") return linkMember(code, msg.from, msg.chat.id);
    }
    await sendMessage(
      msg.chat.id,
      payload
        ? "This link has expired. Open “Join on Telegram” in Monthly again."
        : "Monthly gives paying members access to private groups. Subscribe to a plan on the Monthly website, then tap “Join on Telegram”.",
      { text: "Open Monthly", url: origin },
    );
    return;
  }

  if ((msg.chat.type === "group" || msg.chat.type === "supergroup") && peeked?.kind === "connect") {
    const code = await takeCode(payload!);
    if (code?.kind === "connect") return connectGroup(code, msg.chat, msg.from);
  }
}

/**
 * Binds the Telegram account to the member's subscription. One account per subscription: linking a
 * different account removes the previous one from the group.
 */
async function linkMember(code: Extract<LinkCode, { kind: "member" }>, user: User, chatId: number) {
  const conn = await getTelegramConnection(code.plan);
  if (!conn || conn.status !== "connected") {
    await sendMessage(chatId, "This plan has no Telegram group yet. Tap “Join on Telegram” in Monthly again once the creator has connected one.");
    return;
  }

  const existing = await getGrant(code.subscription);
  if (existing && existing.userId === user.id && existing.state === "granted") {
    // Still in the group: nothing to do. Left on their own: send the link again.
    const member = await tg<ChatMember>("getChatMember", { chat_id: conn.chatId, user_id: user.id }).catch(() => null);
    if (member && member.status !== "left" && member.status !== "kicked") {
      await sendMessage(chatId, `You are already a member of ${conn.title}.`);
      return;
    }
  }
  if (existing && existing.userId !== user.id && existing.state !== "revoked") {
    if (existing.state === "granted") await removeMember(conn.chatId, existing.userId);
    await unlinkTelegramAccount(code.plan, existing.userId);
    await sendMessage(existing.userId, `Your access to ${conn.title} moved to another Telegram account.`).catch(() => undefined);
  }

  await linkTelegramAccount(code.plan, user.id, code.wallet);
  await setGrant(code.subscription, { plan: code.plan, userId: user.id, state: "pending", updatedAt: Date.now() });
  await sendMessage(
    chatId,
    `Linked to wallet ${short(code.wallet)}. Request to join ${conn.title}; the request is approved automatically while your subscription is active.`,
    { text: `Join ${conn.title}`, url: conn.inviteLink },
  );
}

async function connectGroup(code: Extract<LinkCode, { kind: "connect" }>, chat: Chat, from: User) {
  const [sender, bot] = await Promise.all([
    tg<ChatMember>("getChatMember", { chat_id: chat.id, user_id: from.id }),
    tg<ChatMember>("getChatMember", { chat_id: chat.id, user_id: await getBotId() }),
  ]);
  if (sender.status !== "creator" && sender.status !== "administrator") {
    await sendMessage(chat.id, "Only an admin of this group can connect it to a Monthly plan.");
    return;
  }
  if (bot.status !== "administrator" || !bot.can_invite_users || !bot.can_restrict_members) {
    await sendMessage(
      chat.id,
      "I need to be an admin with “Invite users via link” and “Ban users” to manage members. Grant these rights, then press “Connect Telegram” in Monthly again.",
    );
    return;
  }

  // Grants belong to a group: a plan address reused after a delete, or a plan moved to another
  // group, must not inherit the old members' access state.
  const [previous, planAccount] = await Promise.all([
    getTelegramConnection(code.plan),
    fetchPlan(program(), new PublicKey(code.plan)),
  ]);
  if (previous && (previous.chatId !== chat.id || (planAccount && !connectionIsCurrent(previous, planAccount.createdAt.toNumber())))) {
    await clearGrants(code.plan);
  }

  const invite = await tg<{ invite_link: string }>("createChatInviteLink", {
    chat_id: chat.id,
    name: "Monthly members",
    creates_join_request: true,
  });
  await setTelegramConnection(code.plan, {
    chatId: chat.id,
    title: chat.title ?? "your group",
    inviteLink: invite.invite_link,
    status: "connected",
    connectedAt: Date.now(),
  });
  await sendMessage(
    chat.id,
    "✅ This group is now connected to Monthly. Paying members are let in automatically and removed when they stop paying. Only members who join through Monthly are managed, so revoke other invite links.",
  );
}

async function handleJoinRequest(req: JoinRequest, origin: string) {
  const plan = await planForChat(req.chat.id);
  if (!plan) return;
  const wallet = await walletForTelegram(plan, req.from.id);
  const subscription = wallet ? subscriptionPda(new PublicKey(plan), new PublicKey(wallet)).toBase58() : null;
  const grant = subscription ? await getGrant(subscription) : null;
  const ok = !!wallet && grant?.userId === req.from.id && (await activeSubscriber(plan, wallet, req.chat.id));

  if (ok) {
    // Record the grant first: if approval succeeds but a later write failed, the member could never be removed.
    await setGrant(subscription!, { plan, userId: req.from.id, state: "granted", updatedAt: Date.now() });
    try {
      await tg("approveChatJoinRequest", { chat_id: req.chat.id, user_id: req.from.id });
    } catch (err) {
      await setGrant(subscription!, { plan, userId: req.from.id, state: "pending", updatedAt: Date.now() });
      throw err;
    }
    return;
  }
  // user_chat_id is only usable until the request is processed, so message first, then decline.
  await sendMessage(req.user_chat_id, "This group is for paying members. Subscribe first, then tap “Join on Telegram” in Monthly.", {
    text: "Subscribe",
    url: `${origin}/p/${plan}`,
  }).catch(() => undefined);
  await tg("declineChatJoinRequest", { chat_id: req.chat.id, user_id: req.from.id });
}

async function handleBotMembership(update: MemberUpdate) {
  const plan = await planForChat(update.chat.id);
  if (!plan) return;
  const conn = await getTelegramConnection(plan);
  if (!conn || conn.chatId !== update.chat.id) return;
  const m = update.new_chat_member;
  const ok = m.status === "administrator" && m.can_invite_users && m.can_restrict_members;
  const next = ok
    ? { ...conn, status: "connected" as const, error: undefined }
    : { ...conn, status: "error" as const, error: m.status === "administrator" ? "Bot is missing admin rights" : "Bot was removed from the group" };
  await setTelegramConnection(plan, next);
}

async function migrateGroup(oldId: number, newId: number) {
  const plan = await planForChat(oldId);
  if (!plan) return;
  const conn = await getTelegramConnection(plan);
  if (!conn) return;
  const invite = await tg<{ invite_link: string }>("createChatInviteLink", {
    chat_id: newId,
    name: "Monthly members",
    creates_join_request: true,
  });
  await setTelegramConnection(plan, { ...conn, chatId: newId, inviteLink: invite.invite_link });
}

/** Deep link that opens Telegram's "add to group" picker with the rights the bot needs. */
export function connectUrl(code: string): string {
  return `https://t.me/${botUsername()}?startgroup=${code}&admin=invite_users+restrict_members`;
}

export function memberUrl(code: string): string {
  return `https://t.me/${botUsername()}?start=${code}`;
}
