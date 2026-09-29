import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { clientIp } from "@/server/auth/request";
import { createNonce, signInMessage } from "@/server/auth/session";
import { allow } from "@/server/store";

/** Issues a nonce and the exact message the wallet has to sign. */
export async function POST(req: Request) {
  if (!(await allow(`nonce:${clientIp(req)}`, 20, 60))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { wallet } = (await req.json().catch(() => ({}))) as { wallet?: string };
  try {
    new PublicKey(wallet ?? "");
  } catch {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }
  const domain = new URL(req.url).host;
  const { nonce, record } = await createNonce(domain);
  return NextResponse.json({ nonce, message: signInMessage(domain, wallet!, nonce, record) });
}
