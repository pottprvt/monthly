"use client";

import { BN } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";

import {
  Address,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Notice,
  TxLink,
  formatDate,
  inputClass,
  timeUntil,
} from "@/components/ui";
import { INTERVALS, formatUsdc, intervalLabel, parseUsdc } from "@/lib/config";
import { usePoll, useProgram } from "@/lib/hooks";
import {
  type Keyed,
  type PlanAccount,
  type SubscriptionAccount,
  chargeIx,
  closePlanIx,
  createPlanIx,
  fetchPlansByMerchant,
  fetchSubscriptionsByPlan,
  fetchUsdcAccount,
  isPaused,
  toTx,
} from "@/lib/monthly";

type Result = { ok: boolean; text: string; sig?: string };

export default function MerchantPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const program = useProgram();

  const [plans, setPlans] = useState<Keyed<PlanAccount>[]>([]);
  const [hasUsdc, setHasUsdc] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("10");
  const [interval, setInterval] = useState(INTERVALS[0].seconds);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const load = useCallback(async () => {
    if (!publicKey) return;
    const [list, usdc] = await Promise.all([
      fetchPlansByMerchant(program, publicKey),
      fetchUsdcAccount(connection, publicKey),
    ]);
    list.sort((a, b) => b.account.createdAt.cmp(a.account.createdAt));
    setPlans(list);
    setHasUsdc(usdc !== null);
  }, [program, publicKey, connection]);

  usePoll(load);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return;
    setBusy(true);
    setResult(null);
    try {
      const planId = new BN(Date.now());
      const ix = await createPlanIx(
        program,
        publicKey,
        planId,
        name.trim(),
        new BN(parseUsdc(amount).toString()),
        new BN(interval),
      );
      const sig = await sendTransaction(toTx([ix], publicKey), connection);
      await connection.confirmTransaction(sig, "confirmed");
      setResult({ ok: true, text: "Plan created.", sig });
      setName("");
      await load();
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!publicKey) {
    return <Empty>Connect a wallet to create plans and see your subscribers.</Empty>;
  }

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="mb-1 text-xl font-semibold">New plan</h1>
        <p className="mb-4 text-sm text-muted">
          Charges are paid to your USDC account. Amount and interval are fixed once created.
        </p>
        {hasUsdc === false && (
          <div className="mb-4">
            <Notice tone="error">
              Your wallet has no USDC account yet. Get devnet USDC from faucet.circle.com first,
              the plan needs an account to pay into.
            </Notice>
          </div>
        )}
        <form onSubmit={createPlan} className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder="Trading group"
              required
            />
          </Field>
          <Field label="Amount (USDC)">
            <input
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              required
            />
          </Field>
          <Field label="Interval">
            <select
              className={inputClass}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            >
              {INTERVALS.map((i) => (
                <option key={i.seconds} value={i.seconds}>
                  {i.label}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={busy || hasUsdc === false}>
            {busy ? "Creating…" : "Create plan"}
          </Button>
        </form>
        {result && (
          <div className="mt-4">
            <Notice tone={result.ok ? "ok" : "error"}>
              {result.text} {result.sig && <TxLink sig={result.sig} />}
            </Notice>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your plans</h2>
        {plans.length === 0 && <Empty>No plans yet.</Empty>}
        {plans.map((p) => (
          <PlanCard key={p.publicKey.toBase58()} plan={p} onChange={load} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, onChange }: { plan: Keyed<PlanAccount>; onChange: () => Promise<void> }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const program = useProgram();
  const [subs, setSubs] = useState<Keyed<SubscriptionAccount>[]>([]);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const list = await fetchSubscriptionsByPlan(program, plan.publicKey);
    list.sort((a, b) => a.account.nextChargeAt.cmp(b.account.nextChargeAt));
    setSubs(list);
    setNow(Math.floor(Date.now() / 1000));
  }, [program, plan.publicKey]);

  usePoll(load, 15_000);

  const due = subs.filter((s) => !isPaused(s.account) && s.account.nextChargeAt.toNumber() <= now);

  async function run(label: string, build: () => Promise<Parameters<typeof toTx>[0]>) {
    if (!publicKey) return;
    setBusy(label);
    setResult(null);
    try {
      const ixs = await build();
      const sig = await sendTransaction(toTx(ixs, publicKey), connection);
      await connection.confirmTransaction(sig, "confirmed");
      setResult({ ok: true, text: `${label} done.`, sig });
      await Promise.all([load(), onChange()]);
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function chargeDue() {
    await run("Charge", async () =>
      Promise.all(due.slice(0, 8).map((s) => chargeIx(program, publicKey!, plan, s))),
    );
  }

  async function closePlan() {
    if (!confirm("Close this plan? No further charges or subscriptions will be possible.")) return;
    await run("Close plan", async () => [await closePlanIx(program, publicKey!, plan.publicKey)]);
  }

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${plan.publicKey.toBase58()}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const a = plan.account;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{a.name}</h3>
            <Badge tone={a.active ? "ok" : "off"}>{a.active ? "active" : "closed"}</Badge>
          </div>
          <div className="text-sm text-muted">
            {formatUsdc(a.amount.toString())} USDC {intervalLabel(a.intervalSeconds.toNumber())} ·{" "}
            {a.subscriberCount.toString()} subscriber{a.subscriberCount.eqn(1) ? "" : "s"} ·{" "}
            {formatUsdc(a.totalCollected.toString())} USDC collected
          </div>
          <div className="mt-1">
            <Address value={plan.publicKey.toBase58()} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={copy} disabled={!a.active}>
            {copied ? "Copied" : "Copy subscribe link"}
          </Button>
          <Button onClick={chargeDue} disabled={busy !== null || due.length === 0 || !a.active}>
            {busy === "Charge" ? "Charging…" : `Charge due (${due.length})`}
          </Button>
          {a.active && (
            <Button variant="danger" onClick={closePlan} disabled={busy !== null}>
              Close
            </Button>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-3">
          <Notice tone={result.ok ? "ok" : "error"}>
            {result.text} {result.sig && <TxLink sig={result.sig} />}
          </Notice>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        {subs.length === 0 ? (
          <p className="text-sm text-muted">No subscribers yet. Share the link above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 pr-4 font-normal">Subscriber</th>
                <th className="py-1 pr-4 font-normal">Status</th>
                <th className="py-1 pr-4 font-normal">Periods paid</th>
                <th className="py-1 pr-4 font-normal">Next charge</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const next = s.account.nextChargeAt.toNumber();
                const paused = isPaused(s.account);
                return (
                  <tr key={s.publicKey.toBase58()} className="border-t border-line">
                    <td className="py-2 pr-4">
                      <Address value={s.account.subscriber.toBase58()} />
                    </td>
                    <td className="py-2 pr-4">
                      <Badge tone={paused ? "warn" : next <= now ? "warn" : "ok"}>
                        {paused ? "paused" : next <= now ? "due" : "active"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{s.account.periodsPaid.toString()}</td>
                    <td className="py-2 pr-4" title={formatDate(next)}>
                      {paused ? "—" : timeUntil(next)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
