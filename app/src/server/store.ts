/**
 * Typed access to Redis (Upstash via the Vercel Marketplace). The only place with key strings.
 * No next/* imports so scripts can use it too.
 */
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeConfigured = () => !!url && !!token;

let client: Redis | null = null;
function redis(): Redis {
  if (!url || !token) throw new Error("Redis is not configured");
  client ??= new Redis({ url, token });
  return client;
}

// ---- one-time values -------------------------------------------------------

export type NonceRecord = { issuedAt: string; expiresAt: string; domain: string };

export async function putNonce(nonce: string, record: NonceRecord) {
  await redis().set(`nonce:${nonce}`, record, { ex: 300 });
}
export async function takeNonce(nonce: string): Promise<NonceRecord | null> {
  return redis().getdel<NonceRecord>(`nonce:${nonce}`);
}

export type LinkCode =
  | { kind: "connect"; plan: string; wallet: string }
  | { kind: "member"; plan: string; wallet: string; subscription: string };

export async function putCode(code: string, value: LinkCode) {
  await redis().set(`code:${code}`, value, { ex: 600 });
}
export async function takeCode(code: string): Promise<LinkCode | null> {
  return redis().getdel<LinkCode>(`code:${code}`);
}

/** True the first time an update id is seen within a day (webhook retries are ignored). */
export async function firstSeen(updateId: number): Promise<boolean> {
  return (await redis().set(`seen:tg:${updateId}`, 1, { nx: true, ex: 86_400 })) === "OK";
}

/** Fixed-window rate limit; returns false when the caller is over the limit. */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const count = await redis().incr(bucket);
  if (count === 1) await redis().expire(bucket, windowSeconds);
  return count <= limit;
}

// ---- Telegram connections --------------------------------------------------

export type TelegramConnection = {
  chatId: number;
  title: string;
  inviteLink: string;
  status: "connected" | "error";
  error?: string;
  connectedAt: number;
};

export async function getTelegramConnection(plan: string): Promise<TelegramConnection | null> {
  return redis().get<TelegramConnection>(`conn:${plan}:telegram`);
}
export async function setTelegramConnection(plan: string, conn: TelegramConnection) {
  await Promise.all([
    redis().set(`conn:${plan}:telegram`, conn),
    redis().set(`target:telegram:${conn.chatId}`, plan),
    redis().sadd("telegram:plans", plan),
  ]);
}
export async function planForChat(chatId: number): Promise<string | null> {
  return redis().get<string>(`target:telegram:${chatId}`);
}
export async function telegramPlans(): Promise<string[]> {
  return redis().smembers("telegram:plans");
}

// ---- linked accounts and access grants -------------------------------------

export async function linkTelegramAccount(wallet: string, userId: number) {
  await Promise.all([redis().set(`id:telegram:${wallet}`, userId), redis().set(`idr:telegram:${userId}`, wallet)]);
}
export async function walletForTelegram(userId: number): Promise<string | null> {
  return redis().get<string>(`idr:telegram:${userId}`);
}

export type Grant = { plan: string; userId: number; state: "pending" | "granted" | "revoked"; updatedAt: number };

export async function getGrant(subscription: string): Promise<Grant | null> {
  return redis().get<Grant>(`grant:${subscription}:telegram`);
}
export async function setGrant(subscription: string, grant: Grant) {
  await Promise.all([
    redis().set(`grant:${subscription}:telegram`, grant),
    redis().sadd(`grants:${grant.plan}`, subscription),
  ]);
}
export async function grantsForPlan(plan: string): Promise<string[]> {
  return redis().smembers(`grants:${plan}`);
}
