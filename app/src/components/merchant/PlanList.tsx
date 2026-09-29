"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useState } from "react";

import { LinkIcon, PenIcon, PlusIcon, UsersIcon, XIcon } from "@/components/icons";
import { PlanAvatar } from "@/components/PlanAvatar";
import { Badge, Button, Card, ResultNotice } from "@/components/ui";
import { formatUsdc, perInterval } from "@/lib/config";
import { useProgram, useTx } from "@/lib/hooks";
import { type Keyed, type PlanAccount, closePlanIx } from "@/lib/monthly";
import type { MerchantData } from "@/lib/useMerchantData";

export function PlanList({
  data,
  onNew,
  onEdit,
}: {
  data: MerchantData;
  onNew: () => void;
  onEdit: (plan: Keyed<PlanAccount>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.plans.map((p) => (
        <PlanTile key={p.publicKey.toBase58()} plan={p} onChange={data.reload} onEdit={() => onEdit(p)} />
      ))}
      <button
        onClick={onNew}
        className="grid min-h-48 place-items-center rounded-2xl border-2 border-dashed border-line text-muted transition hover:border-accent hover:text-accent"
      >
        <span className="flex flex-col items-center gap-2 text-sm">
          <PlusIcon size={24} /> New plan
        </span>
      </button>
    </div>
  );
}

function PlanTile({
  plan,
  onChange,
  onEdit,
}: {
  plan: Keyed<PlanAccount>;
  onChange: () => Promise<void>;
  onEdit: () => void;
}) {
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

  return (
    <Card className={`flex flex-col gap-4 ${a.active ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between">
        <PlanAvatar image={a.image} name={a.name} size={44} />
        {!a.active && <Badge tone="off">closed</Badge>}
      </div>
      <Link href={`/p/${key}`} className="group">
        <div className="font-semibold group-hover:underline">{a.name}</div>
        <div className="mt-0.5">
          <span className="text-2xl font-semibold tabular-nums">{formatUsdc(a.amount)}</span>{" "}
          <span className="text-sm text-muted">USDC {perInterval(a.intervalSeconds.toNumber())}</span>
        </div>
      </Link>
      <div className="flex items-center gap-4 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <UsersIcon size={15} /> {a.subscriberCount.toString()}
        </span>
        <span>{formatUsdc(a.totalCollected)} USDC earned</span>
      </div>
      {a.active && (
        <div className="mt-auto flex gap-2 border-t border-line pt-4">
          <Button variant="ghost" size="sm" onClick={copy}>
            <LinkIcon size={14} /> {copied ? "Copied" : "Share"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <PenIcon size={14} /> Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="ml-auto"
            disabled={busy !== null}
            onClick={() => {
              if (!confirm(`Close “${a.name}”? No further payments or new subscribers.`)) return;
              void run("Close", async () => [await closePlanIx(program, publicKey!, plan.publicKey)], "Plan closed.");
            }}
          >
            <XIcon size={14} />
          </Button>
        </div>
      )}
      <ResultNotice result={result} />
    </Card>
  );
}
