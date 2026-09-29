import { cookies } from "next/headers";

import { readSession, SESSION_COOKIE } from "./session";

/** Wallet of the signed-in session for this request, or null. */
export async function sessionWallet(): Promise<string | null> {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * Rejects cross-site POSTs that carry our session cookie. Browsers send Origin on POST; requests
 * without it (scripts, server-to-server) carry no cookie of ours anyway.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}

/** Client IP for rate limiting (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
