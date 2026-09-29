import {
  ACTIONS_CORS_HEADERS,
  type ActionGetResponse,
  type ActionPostRequest,
  createPostResponse,
} from "@solana/actions";
import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import {
  fetchPlan,
  fetchSubscription,
  fetchUsdcAccount,
  readProgram,
  spendingLimitLeft,
  subscribeIxs,
  subscriptionPda,
  toTx,
} from "@/lib/chain";
import { RPC_URL } from "@/lib/config";
import { formatUsdc, perInterval } from "@/lib/format";

const headers = { ...ACTIONS_CORS_HEADERS, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export function OPTIONS() {
  return new Response(null, { headers });
}

type Ctx = { params: Promise<{ plan: string }> };

function parseKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

/** Blink card for a plan's checkout link. */
export async function GET(req: Request, ctx: Ctx) {
  const planKey = parseKey((await ctx.params).plan);
  if (!planKey) return json({ message: "invalid plan address" }, 400);
  const plan = await fetchPlan(readProgram(new Connection(RPC_URL, "confirmed")), planKey);
  if (!plan) return json({ message: "plan not found" }, 404);

  const price = `${formatUsdc(plan.amount)} USDC ${perInterval(plan.intervalSeconds.toNumber())}`;
  const body: ActionGetResponse = {
    type: "action",
    icon: /^https:\/\//.test(plan.image) ? plan.image : `${new URL(req.url).origin}/icon.png`,
    title: plan.name,
    description: `${price}. Approve once, cancel anytime. No price increase without your approval.`,
    label: plan.active ? "Subscribe" : "Plan closed",
    disabled: !plan.active,
    links: {
      actions: [
        {
          type: "transaction",
          label: `Subscribe · ${formatUsdc(plan.amount)} USDC`,
          href: `/api/actions/subscribe/${planKey.toBase58()}?payments={payments}`,
          parameters: [{ name: "payments", label: "Spending limit in payments, e.g. 12", type: "number", min: 1, max: 120, required: true }],
        },
      ],
    },
  };
  return json(body);
}

/** Builds the same approve-and-subscribe transaction as the web checkout. */
export async function POST(req: Request, ctx: Ctx) {
  const planKey = parseKey((await ctx.params).plan);
  if (!planKey) return json({ message: "invalid plan address" }, 400);
  const payments = Math.min(120, Math.max(1, Number(new URL(req.url).searchParams.get("payments") ?? 12) || 12));
  const body = (await req.json().catch(() => null)) as ActionPostRequest | null;
  const account = parseKey(body?.account ?? "");
  if (!account) return json({ message: "invalid account" }, 400);

  const connection = new Connection(RPC_URL, "confirmed");
  const program = readProgram(connection);
  const plan = await fetchPlan(program, planKey);
  if (!plan || !plan.active) return json({ message: "plan not available" }, 404);
  if (await fetchSubscription(program, subscriptionPda(planKey, account))) return json({ message: "already subscribed" }, 400);
  const usdc = await fetchUsdcAccount(connection, account);
  if (!usdc) return json({ message: "wallet has no USDC account" }, 400);

  const amount = BigInt(plan.amount.toString());
  const tx = toTx(await subscribeIxs(program, account, planKey, plan, spendingLimitLeft(usdc) + amount * BigInt(payments)), account);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return json(
    await createPostResponse({
      fields: { type: "transaction", transaction: tx, message: `Subscribed to ${plan.name}.` },
    }),
  );
}
