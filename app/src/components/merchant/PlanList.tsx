"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useState } from "react";

import { Address, Badge, Button, Card, Empty, ResultNotice } from "@/components/ui";
import { formatUsdc, intervalLabel } from "@/lib/config";
import { useProgram, useTx } from "@/lib/hooks";
import { type Keyed, type PlanAccount, closePlanIx } from "@/lib/monthly";
import type { MerchantData } from "@/lib/useMerchantData";

export function PlanList({ data, onNew }: { data: MerchantData; onNew: () => void }) {
  if (data.plans.length === 0) {
    return (
      <Empty title="No plans yet">
        <p>Create your first plan and share its link.</p>
        <Button className="mt-4" onClick={onNew}>
          New plan
        </Button>
      </Empty>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.plans.map((p) => (
        <PlanCard key={p.publicKey.toBase58()} plan={p} onChange={data.reload} />
      ))}
    </div>
  );
}

function PlanCard({ plan, onChange }: { plan: Keyed<PlanAccount>; onChange: () => Promise<void> }) {
  const { publicKey } = useWallet();
  const program = useProgram();
  const { busy, result, run } = useTx(onChange);
  const [copied, setCopied] = useState(false);
  const a = plan.account;
  const key = plan.publicKey.toBase58();

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${key}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function close() {
    if (!confirm(`Close “${a.name}”? No further charges or new subscriptions will be possible.`)) return;
    await run("Close plan", async () => [await closePlanIx(program, publicKey!, plan.publicKey)], "Plan closed.");
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{a.name}</h3>
          <div className="text-sm text-muted">
            {formatUsdc(a.amount.toString())} USDC {intervalLabel(a.intervalSeconds.toNumber())}
          </div>
        </div>
        <Badge tone={a.active ? "ok" : "off"}>{a.active ? "active" : "closed"}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-panel-strong px-3 py-2">
          <dt className="text-xs text-muted">Subscribers</dt>
          <dd className="font-medium tabular-nums">{a.subscriberCount.toString()}</dd>
        </div>
        <div className="rounded-lg bg-panel-strong px-3 py-2">
          <dt className="text-xs text-muted">Collected</dt>
          <dd className="font-medium tabular-nums">{formatUsdc(a.totalCollected.toString())} USDC</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        {a.active && (
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? "Link copied ✓" : "Copy subscribe link"}
          </Button>
        )}
        <Link href={`/p/${key}`} className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-panel-strong">
          Open plan page
        </Link>
        {a.active && (
          <Button variant="danger" size="sm" onClick={close} disabled={busy !== null}>
            {busy ? "Closing…" : "Close plan"}
          </Button>
        )}
        <span className="ml-auto">
          <Address value={key} />
        </span>
      </div>
      <ResultNotice result={result} />
    </Card>
  );
}
