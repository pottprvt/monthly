import { NextResponse } from "next/server";

import { sameOrigin } from "@/server/auth/request";
import { issueSession, SESSION_COOKIE, verifySignIn } from "@/server/auth/session";

/** Verifies the signed message and starts a session for that wallet. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { wallet?: string; nonce?: string; signature?: string };
  if (!body.wallet || !body.nonce || !body.signature) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  if (!(await verifySignIn(body.wallet, body.nonce, body.signature))) {
    return NextResponse.json({ error: "Signature could not be verified" }, { status: 401 });
  }
  const session = issueSession(body.wallet);
  const res = NextResponse.json({ wallet: body.wallet });
  res.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
  return res;
}
