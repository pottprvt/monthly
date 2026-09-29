import { cookies } from "next/headers";

import { readSession, SESSION_COOKIE } from "./session";

/** Wallet of the signed-in session for this request, or null. */
export async function sessionWallet(): Promise<string | null> {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Client IP for rate limiting (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
