/**
 * End-to-end run against devnet with fresh wallets: plan -> subscribe -> wait -> charge -> cancel -> close.
 * Usage: FAUCET_KEYPAIR="$(cat ~/.config/solana/monthly-faucet.json)" npx tsx scripts/e2e.ts
 */
import { BN, Wallet } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import { RPC_URL, USDC_MINT, explorerTx, formatUsdc } from "../src/lib/config";
import {
  cancelIx,
  chargeIx,
  closePlanIx,
  createPlanIx,
  planPda,
  subscribeIxs,
  subscriptionPda,
  usdcAta,
  walletProgram,
} from "../src/lib/monthly";

const connection = new Connection(RPC_URL, "confirmed");
const faucet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.FAUCET_KEYPAIR!)));
const AMOUNT = 5_000_000n; // 5 test USDC
const INTERVAL = 60;

async function send(label: string, ixs: TransactionInstruction[], signers: Keypair[]) {
  const sig = await sendAndConfirmTransaction(connection, new Transaction().add(...ixs), signers, {
    commitment: "confirmed",
  });
  console.log(`${label.padEnd(22)} ${explorerTx(sig)}`);
  return sig;
}

async function balance(owner: Keypair) {
  return (await getAccount(connection, usdcAta(owner.publicKey))).amount;
}

async function expectFailure(label: string, fn: () => Promise<unknown>, needle: string) {
  try {
    await fn();
  } catch (err) {
    const text = String((err as Error).message) + JSON.stringify((err as { logs?: string[] }).logs ?? []);
    if (!text.includes(needle)) throw new Error(`${label}: failed for the wrong reason: ${text}`);
    console.log(`${label.padEnd(22)} refused as expected (${needle})`);
    return;
  }
  throw new Error(`${label}: should have failed`);
}

async function main() {
  const merchant = Keypair.generate();
  const subscriber = Keypair.generate();
  console.log(`merchant   ${merchant.publicKey.toBase58()}\nsubscriber ${subscriber.publicKey.toBase58()}`);

  await send(
    "fund wallets",
    [
      SystemProgram.transfer({ fromPubkey: faucet.publicKey, toPubkey: merchant.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
      SystemProgram.transfer({ fromPubkey: faucet.publicKey, toPubkey: subscriber.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
      createAssociatedTokenAccountIdempotentInstruction(faucet.publicKey, usdcAta(merchant.publicKey), merchant.publicKey, USDC_MINT),
      createAssociatedTokenAccountIdempotentInstruction(faucet.publicKey, usdcAta(subscriber.publicKey), subscriber.publicKey, USDC_MINT),
      createMintToInstruction(USDC_MINT, usdcAta(subscriber.publicKey), faucet.publicKey, 100_000_000n),
    ],
    [faucet],
  );

  const mProgram = walletProgram(connection, new Wallet(merchant));
  const sProgram = walletProgram(connection, new Wallet(subscriber));
  const planId = new BN(Date.now());
  const plan = planPda(merchant.publicKey, planId);

  await send(
    "create plan",
    [await createPlanIx(mProgram, merchant.publicKey, planId, "E2E plan", new BN(AMOUNT.toString()), new BN(INTERVAL))],
    [merchant],
  );
  const planAccount = await mProgram.account.plan.fetch(plan);

  await send(
    "approve + subscribe",
    await subscribeIxs(sProgram, subscriber.publicKey, plan, planAccount, AMOUNT * 3n),
    [subscriber],
  );
  console.log(`merchant balance       ${formatUsdc(await balance(merchant))} (expect 5.00)`);

  const sub = { publicKey: subscriptionPda(plan, subscriber.publicKey), account: await sProgram.account.subscription.fetch(subscriptionPda(plan, subscriber.publicKey)) };
  const keyedPlan = { publicKey: plan, account: planAccount };
  const faucetProgram = walletProgram(connection, new Wallet(faucet));

  await expectFailure(
    "charge before due",
    async () => send("charge", [await chargeIx(faucetProgram, faucet.publicKey, keyedPlan, sub)], [faucet]),
    "NotDue",
  );

  const wait = sub.account.nextChargeAt.toNumber() - Math.floor(Date.now() / 1000) + 5;
  console.log(`waiting ${wait}s for the next period…`);
  await new Promise((r) => setTimeout(r, wait * 1000));

  await send("charge (due)", [await chargeIx(faucetProgram, faucet.publicKey, keyedPlan, sub)], [faucet]);
  console.log(`merchant balance       ${formatUsdc(await balance(merchant))} (expect 10.00)`);
  const after = await sProgram.account.subscription.fetch(sub.publicKey);
  console.log(`periods paid           ${after.periodsPaid.toString()} (expect 2)`);

  await send("cancel", [await cancelIx(sProgram, subscriber.publicKey, plan, sub.publicKey)], [subscriber]);
  await send("close plan", [await closePlanIx(mProgram, merchant.publicKey, plan)], [merchant]);
  console.log("E2E OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
