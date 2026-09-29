/**
 * Wallet proof: the server issues a nonce, the wallet signs a readable message, the server
 * verifies the ed25519 signature and issues an HMAC-signed session value (stored as HttpOnly cookie).
 * Wallet addresses from request bodies are never trusted without this proof.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

import { putNonce, takeNonce, type NonceRecord } from "@/server/store";

export const SESSION_COOKIE = "monthly_session";
const SESSION_DAYS = 7;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

export function signInMessage(domain: string, wallet: string, nonce: string, record: NonceRecord): string {
  return [
    `${domain} wants you to sign in with your Solana account:`,
    wallet,
    "",
    "Sign in to Monthly to connect your community access. This does not cost anything.",
    "",
    `Nonce: ${nonce}`,
    `Issued At: ${record.issuedAt}`,
    `Expiration Time: ${record.expiresAt}`,
  ].join("\n");
}

export async function createNonce(domain: string): Promise<{ nonce: string; record: NonceRecord }> {
  const nonce = randomBytes(16).toString("hex");
  const now = new Date();
  const record = { domain, issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString() };
  await putNonce(nonce, record);
  return { nonce, record };
}

/** Verifies a signed sign-in message. The nonce is consumed whether or not verification succeeds. */
export async function verifySignIn(wallet: string, nonce: string, signatureBase64: string): Promise<boolean> {
  const record = await takeNonce(nonce);
  if (!record || Date.parse(record.expiresAt) < Date.now()) return false;
  let key: PublicKey;
  try {
    key = new PublicKey(wallet);
  } catch {
    return false;
  }
  const message = new TextEncoder().encode(signInMessage(record.domain, wallet, nonce, record));
  const signature = Buffer.from(signatureBase64, "base64");
  if (signature.length !== 64) return false;
  return nacl.sign.detached.verify(message, signature, key.toBytes());
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function issueSession(wallet: string): { value: string; maxAge: number } {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400;
  const payload = b64url(Buffer.from(JSON.stringify({ w: wallet, e: exp })));
  const mac = b64url(createHmac("sha256", secret()).update(payload).digest());
  return { value: `${payload}.${mac}`, maxAge: SESSION_DAYS * 86_400 };
}

/** Returns the wallet of a valid session value, or null. */
export function readSession(value: string | undefined): string | null {
  if (!value) return null;
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { w, e } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { w: string; e: number };
    return e > Date.now() / 1000 ? w : null;
  } catch {
    return null;
  }
}
