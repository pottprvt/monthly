import {
  ACTIONS_CORS_HEADERS,
  type ActionGetResponse,
  type ActionPostRequest,
  createPostResponse,
} from "@solana/actions";
import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { RPC_URL, formatUsdc, intervalLabel } from "@/lib/config";
import { readProgram, subscribeIxs, subscriptionPda, toTx, fetchUsdcAccount, mandateRemaining } from "@/lib/monthly";

const headers = { ...ACTIONS_CORS_HEADERS, "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export async function OPTIONS() {
  return new Response(null, { headers });
}

type Ctx = { params: Promise<{ plan: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { plan: planParam } = await ctx.params;
  const connection = new Connection(RPC_URL, "confirmed");
  const program = readProgram(connection);
  let planKey: PublicKey;
  try {
    planKey = new PublicKey(planParam);
  } catch {
    return json({ message: "invalid plan address" }, 400);
  }
  const plan = await program.account.plan.fetchNullable(planKey);
  if (!plan) return json({ message: "plan not found" }, 404);

  const origin = new URL(req.url).origin;
  const amount = formatUsdc(plan.amount.toString());
  const body: ActionGetResponse = {
    type: "action",
    icon: `${origin}/icon.png`,
    title: plan.name,
    description: `${amount} USDC ${intervalLabel(plan.intervalSeconds.toNumber())}. Approve a mandate once; the plan amount is pulled when due. Cancel any time.`,
    label: plan.active ? `Subscribe for ${amount} USDC` : "Plan closed",
    disabled: !plan.active,
    links: {
      actions: [
        {
          type: "transaction",
          label: `Subscribe (${amount} USDC now)`,
          href: `/api/actions/subscribe/${planParam}?periods={periods}`,
          parameters: [
            {
              name: "periods",
              label: "Mandate ceiling in periods (e.g. 12)",
              type: "number",
              min: 1,
              max: 120,
              required: true,
            },
          ],
        },
      ],
    },
  };
  return json(body);
}

export async function POST(req: Request, ctx: Ctx) {
  const { plan: planParam } = await ctx.params;
  const url = new URL(req.url);
  const periods = Math.min(120, Math.max(1, Number(url.searchParams.get("periods") ?? 12)));
  let account: PublicKey;
  try {
    const body = (await req.json()) as ActionPostRequest;
    account = new PublicKey(body.account);
  } catch {
    return json({ message: "invalid account" }, 400);
  }

  const connection = new Connection(RPC_URL, "confirmed");
  const program = readProgram(connection);
  const planKey = new PublicKey(planParam);
  const plan = await program.account.plan.fetchNullable(planKey);
  if (!plan || !plan.active) return json({ message: "plan not available" }, 404);

  const existing = await program.account.subscription.fetchNullable(subscriptionPda(planKey, account));
  if (existing) return json({ message: "already subscribed" }, 400);

  const usdc = await fetchUsdcAccount(connection, account);
  if (!usdc) return json({ message: "wallet has no USDC account" }, 400);

  const amount = BigInt(plan.amount.toString());
  const allowance = mandateRemaining(usdc) + amount * BigInt(periods);
  const ixs = await subscribeIxs(program, account, planKey, plan, allowance);
  const tx = toTx(ixs, account);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const payload = await createPostResponse({
    fields: {
      type: "transaction",
      transaction: tx,
      message: `Subscribed to ${plan.name}: ${formatUsdc(amount)} USDC ${intervalLabel(plan.intervalSeconds.toNumber())}.`,
    },
  });
  return json(payload);
}
