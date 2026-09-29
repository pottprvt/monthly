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

  const connection = new Connection(RPC_URL, "confirmed");
  const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
  const [usdc, lamports] = await Promise.all([
    getAccount(connection, ata).catch(() => null),
    connection.getBalance(owner),
  ]);
  if (usdc && usdc.amount >= USDC_CAP) {
    return NextResponse.json({ error: "you already have plenty of test USDC" }, { status: 429 });
  }

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(faucet.publicKey, ata, owner, USDC_MINT),
    createMintToInstruction(USDC_MINT, ata, faucet.publicKey, USDC_PER_REQUEST),
  );
  const topUp = lamports < SOL_THRESHOLD;
  if (topUp) {
    tx.add(SystemProgram.transfer({ fromPubkey: faucet.publicKey, toPubkey: owner, lamports: SOL_TOPUP }));
  }

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [faucet], {
      commitment: "confirmed",
    });
    return NextResponse.json({ signature, usdc: 100, sol: topUp ? 0.05 : 0 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message.split("\n")[0] }, { status: 500 });
  }
}
