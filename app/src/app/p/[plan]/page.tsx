"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  Address,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  InlineLink,
  Notice,
  TxLink,
  formatDate,
  inputClass,
  timeUntil,
} from "@/components/ui";
import { formatUsdc, intervalLabel } from "@/lib/config";
import { usePoll, useProgram } from "@/lib/hooks";
import {
  type PlanAccount,
  type SubscriptionAccount,
  fetchUsdcAccount,
  isPaused,
  mandateRemaining,
  subscribeIxs,
  subscriptionPda,
  toTx,
} from "@/lib/monthly";

export default function PlanPage() {
  const { plan: planParam } = useParams<{ plan: string }>();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const program = useProgram();

  const planKey = useMemo(() => {
    try {
      return new PublicKey(planParam);
    } catch {
      return null;
    }
  }, [planParam]);
  const [plan, setPlan] = useState<PlanAccount | null | undefined>(undefined);
  const [sub, setSub] = useState<SubscriptionAccount | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [remaining, setRemaining] = useState<bigint>(0n);
  const [periods, setPeriods] = useState(12);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);

  const load = useCallback(async () => {
    if (!planKey) return;
    const p = await program.account.plan.fetchNullable(planKey);
    setPlan(p);
    if (!publicKey || !p) return;
    const [s, usdc] = await Promise.all([
      program.account.subscription.fetchNullable(subscriptionPda(planKey, publicKey)),
      fetchUsdcAccount(connection, publicKey),
    ]);
    setSub(s);
    setBalance(usdc ? usdc.amount : null);
    setRemaining(mandateRemaining(usdc));
  }, [planKey, program, publicKey, connection]);

  usePoll(load);

  async function subscribe() {
    if (!publicKey || !plan || !planKey) return;
    setBusy(true);
    setResult(null);
    try {
      const amount = BigInt(plan.amount.toString());
      const allowance = remaining + amount * BigInt(periods);
      const ixs = await subscribeIxs(program, publicKey, planKey, plan, allowance);
      const sig = await sendTransaction(toTx(ixs, publicKey), connection);
      await connection.confirmTransaction(sig, "confirmed");
      setResult({ ok: true, text: "Subscribed. First period collected.", sig });
      await load();
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!planKey || plan === null) return <Empty>This plan does not exist.</Empty>;
  if (plan === undefined) return <Empty>Loading plan…</Empty>;

  const amount = BigInt(plan.amount.toString());
  const interval = plan.intervalSeconds.toNumber();
  const canPay = balance !== null && balance >= amount;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{plan.name}</h1>
            <p className="text-muted">
              {formatUsdc(amount)} USDC {intervalLabel(interval)}
            </p>
          </div>
          <Badge tone={plan.active ? "ok" : "off"}>{plan.active ? "active" : "closed"}</Badge>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Merchant</dt>
          <dd>
            <Address value={plan.merchant.toBase58()} />
          </dd>
          <dt className="text-muted">Subscribers</dt>
          <dd>{plan.subscriberCount.toString()}</dd>
          <dt className="text-muted">Plan</dt>
          <dd>
            <Address value={planParam} />
          </dd>
        </dl>
      </Card>

      {!publicKey && <Empty>Connect a wallet to subscribe.</Empty>}

      {publicKey && sub && (
        <Card>
          <h2 className="mb-2 font-medium">You are subscribed</h2>
          <p className="text-sm text-muted">
            {isPaused(sub)
              ? "Paused: the last charge could not be covered."
              : `Next charge ${timeUntil(sub.nextChargeAt.toNumber())} (${formatDate(sub.nextChargeAt.toNumber())}).`}{" "}
            {sub.periodsPaid.toString()} period{sub.periodsPaid.eqn(1) ? "" : "s"} paid.
          </p>
          <p className="mt-3 text-sm">
            <InlineLink href="/me">Manage in My subscriptions →</InlineLink>
          </p>
        </Card>
      )}

      {publicKey && !sub && plan.active && (
        <Card>
          <h2 className="mb-1 font-medium">Subscribe</h2>
          <p className="mb-4 text-sm text-muted">
            One signature: approve a mandate for the allowance below and pay the first period now.
            The rest stays in your wallet and is pulled only when due.
          </p>
          {balance === null && (
            <div className="mb-4">
              <Notice tone="error">
                No USDC account in this wallet. Get devnet USDC from faucet.circle.com first.
              </Notice>
            </div>
          )}
          {balance !== null && !canPay && (
            <div className="mb-4">
              <Notice tone="error">
                Balance {formatUsdc(balance)} USDC is below the first period of {formatUsdc(amount)} USDC.
              </Notice>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field
              label="Mandate ceiling (periods)"
              hint={`Monthly may pull at most ${formatUsdc(remaining + amount * BigInt(periods))} USDC in total${remaining > 0n ? `, including ${formatUsdc(remaining)} USDC already approved for other plans` : ""}. You can revoke any time.`}
            >
              <input
                className={inputClass}
                type="number"
                min={1}
                max={120}
                value={periods}
                onChange={(e) => setPeriods(Math.max(1, Number(e.target.value)))}
              />
            </Field>
            <Button onClick={subscribe} disabled={busy || !canPay}>
              {busy ? "Signing…" : `Approve & pay ${formatUsdc(amount)} USDC`}
            </Button>
          </div>
          {balance !== null && (
            <p className="mt-3 text-xs text-muted">Wallet balance: {formatUsdc(balance)} USDC</p>
          )}
          {result && (
            <div className="mt-4">
              <Notice tone={result.ok ? "ok" : "error"}>
                {result.text} {result.sig && <TxLink sig={result.sig} />}
              </Notice>
            </div>
          )}
        </Card>
      )}

      {publicKey && !sub && !plan.active && <Empty>This plan is closed to new subscriptions.</Empty>}
    </div>
  );
}
