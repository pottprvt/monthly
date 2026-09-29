"use client";

import { useWallet } from "@solana/wallet-adapter-react";

import { ClockIcon, CoinsIcon, PauseIcon, UsersIcon } from "@/components/icons";
import { Button, Card, ResultNotice } from "@/components/ui";
import { formatUsdc } from "@/lib/config";
import { useProgram, useTx } from "@/lib/hooks";
import { chargeIx, isPaused } from "@/lib/monthly";
import type { MerchantData } from "@/lib/useMerchantData";

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">{icon}</div>
      <div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </Card>
  );
}

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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={<UsersIcon />} label="Active subscribers" value={active} />
        <Tile icon={<PauseIcon />} label="Paused" value={paused} />
        <Tile icon={<CoinsIcon />} label="USDC collected" value={formatUsdc(collected)} />
        <Tile icon={<ClockIcon />} label="Due now" value={due.length} />
      </div>
      {due.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">
            {due.length} payment{due.length === 1 ? " is" : "s are"} due. They are collected automatically, or now:
          </span>
          <Button
            onClick={() =>
              run(
                "Collect",
                async () =>
                  Promise.all(
                    due
                      .slice(0, 6)
                      .map((s) => chargeIx(program, publicKey!, planByKey.get(s.account.plan.toBase58())!, s)),
                  ),
                "Collected.",
              )
            }
            disabled={busy !== null}
          >
            {busy ? "Collecting…" : "Collect now"}
          </Button>
        </Card>
      )}
      <ResultNotice result={result} />
    </div>
  );
}
