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
  connectionIsCurrent,
  firstSeen,
  getTelegramConnection,
  linkTelegramAccount,
  planForChat,
  setGrant,
  setTelegramConnection,
  takeCode,
  walletForTelegram,
  type LinkCode,
} from "@/server/store";

import { botUsername, sendMessage, tg, type ChatMember } from "./api";

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

/** Active subscription to the plan that this group is currently connected to. */
async function activeSubscriber(plan: string, wallet: string): Promise<boolean> {
  const p = program();
  const planKey = new PublicKey(plan);
  const [planAccount, sub, conn] = await Promise.all([
    fetchPlan(p, planKey),
    fetchSubscription(p, subscriptionPda(planKey, new PublicKey(wallet))),
    getTelegramConnection(plan),
  ]);
  if (!planAccount?.active || !conn || !connectionIsCurrent(conn, planAccount.createdAt.toNumber())) return false;
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
  const code = payload ? await takeCode(payload) : null;

  if (msg.chat.type === "private") {
    if (code?.kind === "member") return linkMember(code, msg.from, msg.chat.id);
    return void sendMessage(
      msg.chat.id,
      payload
        ? "This link has expired. Open it again from Monthly."
        : "Monthly gives paying members access to private groups. Subscribe to a plan on the Monthly website, then tap “Join on Telegram”.",
      { text: "Open Monthly", url: origin },
    );
  }

  if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    if (code?.kind === "connect") return connectGroup(code, msg.chat, msg.from);
  }
}

async function linkMember(code: Extract<LinkCode, { kind: "member" }>, user: User, chatId: number) {
  await linkTelegramAccount(code.wallet, user.id);
  const conn = await getTelegramConnection(code.plan);
  if (!conn || conn.status !== "connected") {
    return void sendMessage(chatId, "Your wallet is linked. The creator has not connected a Telegram group yet; you will get a message here once they do.");
  }
  await setGrant(code.subscription, { plan: code.plan, userId: user.id, state: "pending", updatedAt: Date.now() });
  await sendMessage(chatId, `Your wallet is linked. Request to join ${conn.title}; your request is approved automatically while your subscription is active.`, {
    text: `Join ${conn.title}`,
    url: conn.inviteLink,
  });
}

async function connectGroup(code: Extract<LinkCode, { kind: "connect" }>, chat: Chat, from: User) {
  const [sender, bot] = await Promise.all([
    tg<ChatMember>("getChatMember", { chat_id: chat.id, user_id: from.id }),
    tg<ChatMember>("getChatMember", { chat_id: chat.id, user_id: await getBotId() }),
  ]);
  if (sender.status !== "creator" && sender.status !== "administrator") {
    return void sendMessage(chat.id, "Only an admin of this group can connect it to a Monthly plan.");
  }
  if (bot.status !== "administrator" || !bot.can_invite_users || !bot.can_restrict_members) {
    return void sendMessage(
      chat.id,
      "I need to be an admin with “Invite users via link” and “Ban users” to manage members. Grant these rights, then press “Connect Telegram” in Monthly again.",
    );
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
  await sendMessage(chat.id, "✅ This group is now connected to Monthly. Paying members are let in automatically and removed when they stop paying.");
}

async function handleJoinRequest(req: JoinRequest, origin: string) {
  const plan = await planForChat(req.chat.id);
  if (!plan) return;
  const wallet = await walletForTelegram(req.from.id);
  const ok = !!wallet && (await activeSubscriber(plan, wallet));
  if (ok) {
    await tg("approveChatJoinRequest", { chat_id: req.chat.id, user_id: req.from.id });
    const subscription = subscriptionPda(new PublicKey(plan), new PublicKey(wallet!)).toBase58();
    await setGrant(subscription, { plan, userId: req.from.id, state: "granted", updatedAt: Date.now() });
    return;
  }
  await tg("declineChatJoinRequest", { chat_id: req.chat.id, user_id: req.from.id });
  await sendMessage(req.user_chat_id, "This group is for paying members. Subscribe first, then tap “Join on Telegram” in Monthly.", {
    text: "Subscribe",
    url: `${origin}/p/${plan}`,
  }).catch(() => undefined);
}

async function handleBotMembership(update: MemberUpdate) {
  const plan = await planForChat(update.chat.id);
  if (!plan) return;
  const conn = await getTelegramConnection(plan);
  if (!conn) return;
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
