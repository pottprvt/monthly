"use client";

import { useWallet } from "@solana/wallet-adapter-react";

import { Button, Card, ResultNotice, Stat } from "@/components/ui";
import { formatUsdc } from "@/lib/config";
import { useProgram, useTx } from "@/lib/hooks";
import { chargeIx, isPaused } from "@/lib/monthly";
import type { MerchantData } from "@/lib/useMerchantData";

export function Overview({ data }: { data: MerchantData }) {
  const { publicKey } = useWallet();
  const program = useProgram();
  const { busy, result, run } = useTx(data.reload);
  const { plans, subs, now } = data;

  const active = subs.filter((s) => !isPaused(s.account)).length;
  const paused = subs.length - active;
  const collected = plans.reduce((sum, p) => sum + BigInt(p.account.totalCollected.toString()), 0n);
  const planByKey = new Map(plans.map((p) => [p.publicKey.toBase58(), p]));
  const due = subs.filter((s) => {
    const plan = planByKey.get(s.account.plan.toBase58());
    return plan?.account.active && !isPaused(s.account) && s.account.nextChargeAt.toNumber() <= now;
  });

  async function chargeDue() {
    await run(
      "Charge",
      async () =>
        Promise.all(
          due.slice(0, 6).map((s) => chargeIx(program, publicKey!, planByKey.get(s.account.plan.toBase58())!, s)),
        ),
      `Collected ${Math.min(due.length, 6)} due payment${due.length === 1 ? "" : "s"}.`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active subscribers" value={active} />
        <Stat label="Paused" value={paused} hint="payment failed after grace period" />
        <Stat label="Collected" value={`${formatUsdc(collected)}`} hint="USDC, all plans, all time" />
        <Stat label="Plans" value={plans.filter((p) => p.account.active).length} hint="active" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium">Payments due now</h3>
            <p className="text-sm text-muted">
              A background job collects due payments every few minutes. You can also collect them
              right away; anyone may trigger a due charge, only the plan amount moves.
            </p>
          </div>
          <Button onClick={chargeDue} disabled={busy !== null || due.length === 0}>
            {busy ? "Collecting…" : due.length === 0 ? "Nothing due" : `Collect ${due.length} now`}
          </Button>
        </div>
        {result && (
          <div className="mt-3">
            <ResultNotice result={result} />
          </div>
        )}
      </Card>
    </div>
  );
}
