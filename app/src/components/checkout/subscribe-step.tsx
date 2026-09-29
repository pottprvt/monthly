"use client";

import type { PublicKey } from "@solana/web3.js";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTestFunds } from "@/components/wallet/use-test-funds";
import { useProgram } from "@/hooks/use-program";
import { useTx } from "@/hooks/use-tx";
import { SUBSCRIPTION_DEPOSIT_LAMPORTS, subscribeIxs, type PlanAccount } from "@/lib/chain";
import { formatSol, formatUsdc, perInterval } from "@/lib/format";

const LIMITS = [3, 6, 12, 24];

/** Spending limit choice, cost summary and the single "approve and pay" transaction. */
export function SubscribeStep({
  planKey,
  plan,
  subscriber,
  balance,
  sol,
  limitLeft,
}: {
  planKey: PublicKey;
  plan: PlanAccount;
  subscriber: PublicKey;
  balance: bigint | null;
  sol: number;
  limitLeft: bigint;
}) {
  const program = useProgram();
  const { busy, run } = useTx();
  const funds = useTestFunds();
  const [periods, setPeriods] = useState(12);

  const amount = BigInt(plan.amount.toString());
  const per = perInterval(plan.intervalSeconds.toNumber());
  const limit = limitLeft + amount * BigInt(periods);
  const enoughUsdc = balance !== null && balance >= amount;
  const enoughSol = sol >= SUBSCRIPTION_DEPOSIT_LAMPORTS + 20_000; // deposit plus fees
  const canPay = enoughUsdc && enoughSol;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Spending limit in payments</span>
          <span className="tabular-nums">up to {formatUsdc(amount * BigInt(periods))} USDC</span>
        </div>
        <ToggleGroup
          variant="outline"
          className="w-full"
          value={[String(periods)]}
          onValueChange={(v: string[]) => v[0] && setPeriods(Number(v[0]))}
        >
          {LIMITS.map((p) => (
            <ToggleGroupItem
              key={p}
              value={String(p)}
              className="flex-1 tabular-nums aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground aria-pressed:hover:text-background"
            >
              {p}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <dl className="divide-y rounded-lg border text-sm">
        <div className="flex justify-between px-3 py-2">
          <dt className="text-muted-foreground">Today</dt>
          <dd className="font-medium tabular-nums">{formatUsdc(amount)} USDC</dd>
        </div>
        <div className="flex justify-between px-3 py-2">
          <dt className="text-muted-foreground">Then</dt>
          <dd className="tabular-nums">
            {formatUsdc(amount)} USDC {per}
          </dd>
        </div>
        <div className="flex justify-between px-3 py-2">
          <dt className="text-muted-foreground">Deposit, returned when you cancel</dt>
          <dd className="tabular-nums">{formatSol(SUBSCRIPTION_DEPOSIT_LAMPORTS)} SOL</dd>
        </div>
      </dl>

      {canPay ? (
        <Button
          size="lg"
          className="h-11 w-full"
          disabled={busy !== null}
          onClick={() =>
            run("subscribe", () => subscribeIxs(program, subscriber, planKey, plan, limit), `Subscribed to ${plan.name}`)
          }
        >
          {busy ? "Confirm in your wallet…" : `Subscribe · ${formatUsdc(amount)} USDC`}
        </Button>
      ) : (
        <div className="space-y-2 rounded-lg bg-muted p-3 text-center text-sm">
          <p className="text-muted-foreground">
            {!enoughUsdc
              ? balance === null
                ? "This wallet has no test USDC yet."
                : `Balance ${formatUsdc(balance)} USDC is too low.`
              : "This wallet needs a little devnet SOL for the deposit and fees."}
          </p>
          <Button variant="outline" onClick={() => funds.request()} disabled={funds.busy}>
            {funds.busy ? "Sending…" : "Get test funds"}
          </Button>
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">One signature. Cancel anytime.</p>
    </div>
  );
}
