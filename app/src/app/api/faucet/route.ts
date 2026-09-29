import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { NextResponse } from "next/server";

import { RPC_URL, USDC_DECIMALS, USDC_MINT } from "@/lib/config";
import { clientIp } from "@/server/auth/request";
import { allow, storeConfigured } from "@/server/store";

const USDC_PER_REQUEST = 100n * 10n ** BigInt(USDC_DECIMALS);
const USDC_CAP = 500n * 10n ** BigInt(USDC_DECIMALS);
const SOL_TOPUP = 0.05 * LAMPORTS_PER_SOL;
const SOL_THRESHOLD = 0.02 * LAMPORTS_PER_SOL;

function faucetKeypair(): Keypair | null {
  const raw = process.env.FAUCET_KEYPAIR;
  if (!raw) return null;
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

/** Devnet only: sends test USDC and, if needed, a little SOL for fees to the requesting wallet. */
export async function POST(req: Request) {
  const faucet = faucetKeypair();
  if (!faucet) return NextResponse.json({ error: "faucet not configured" }, { status: 503 });

  let owner: PublicKey;
  try {
    const body = (await req.json()) as { account?: string };
    owner = new PublicKey(body.account ?? "");
  } catch {
    return NextResponse.json({ error: "invalid account" }, { status: 400 });
  }

  if (storeConfigured()) {
    const ok =
      (await allow(`faucet:ip:${clientIp(req)}`, 5, 3600)) && (await allow(`faucet:wallet:${owner.toBase58()}`, 3, 86_400));
    if (!ok) return NextResponse.json({ error: "Test funds limit reached, try again later" }, { status: 429 });
  }

  const connection = new Connection(RPC_URL, "confirmed");
  const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
  const [usdc, lamports] = await Promise.all([
    getAccount(connection, ata).catch(() => null),
    connection.getBalance(owner),
  ]);
  const needsUsdc = !usdc || usdc.amount < USDC_CAP;
  const topUp = lamports < SOL_THRESHOLD;
  if (!needsUsdc && !topUp) {
    return NextResponse.json({ error: "You already have plenty of test funds" }, { status: 429 });
  }

  const tx = new Transaction();
  if (needsUsdc) {
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(faucet.publicKey, ata, owner, USDC_MINT),
      createMintToInstruction(USDC_MINT, ata, faucet.publicKey, USDC_PER_REQUEST),
    );
  }
  if (topUp) {
    tx.add(SystemProgram.transfer({ fromPubkey: faucet.publicKey, toPubkey: owner, lamports: SOL_TOPUP }));
  }

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [faucet], {
      commitment: "confirmed",
    });
    return NextResponse.json({ signature, usdc: needsUsdc ? 100 : 0, sol: topUp ? 0.05 : 0 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message.split("\n")[0] }, { status: 500 });
  }
}
