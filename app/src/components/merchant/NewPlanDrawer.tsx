"use client";

import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

import { Button, Drawer, Field, Notice, ResultNotice, inputClass } from "@/components/ui";
import { INTERVALS, formatUsdc, intervalLabel, parseUsdc } from "@/lib/config";
import { useProgram, useTx } from "@/lib/hooks";
import { createPlanIx } from "@/lib/monthly";

export function NewPlanDrawer({
  open,
  onClose,
  hasUsdc,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  hasUsdc: boolean | null;
  onCreated: () => Promise<void>;
}) {
  const { publicKey } = useWallet();
  const program = useProgram();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("10");
  const [interval, setInterval] = useState(INTERVALS[0].seconds);
  const { busy, result, run } = useTx(async () => {
    setName("");
    await onCreated();
  });

  let amountValid = true;
  try {
    amountValid = parseUsdc(amount) > 0n;
  } catch {
    amountValid = false;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return;
    await run(
      "Create plan",
      async () => [
        await createPlanIx(
          program,
          publicKey,
          new BN(Date.now()),
          name.trim(),
          new BN(parseUsdc(amount).toString()),
          new BN(interval),
        ),
      ],
      "Plan created. Share its link to get subscribers.",
    );
  }

  return (
    <Drawer open={open} title="New plan" onClose={onClose}>
      <p className="text-sm text-muted">
        Price and interval are fixed once created, so subscribers always know what they agreed to.
      </p>
      {hasUsdc === false && (
        <Notice tone="error">
          Your wallet has no test USDC account yet. Click “Get test funds” at the top first; the plan
          needs an account to pay into.
        </Notice>
      )}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" hint="Shown to subscribers, max. 32 characters.">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            placeholder="Trading group"
            required
          />
        </Field>
        <Field label="Price per period (USDC)">
          <input
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            required
          />
        </Field>
        <Field label="Billing interval" hint="“Every minute” exists so you can watch charges happen live.">
          <select className={inputClass} value={interval} onChange={(e) => setInterval(Number(e.target.value))}>
            {INTERVALS.map((i) => (
              <option key={i.seconds} value={i.seconds}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>
        {amountValid && (
          <div className="rounded-lg bg-panel-strong px-3 py-2 text-sm">
            Subscribers pay <span className="font-medium">{formatUsdc(parseUsdc(amount))} USDC</span>{" "}
            {intervalLabel(interval)}.
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy !== null || hasUsdc === false || !amountValid}>
          {busy ? "Creating…" : "Create plan"}
        </Button>
      </form>
      <ResultNotice result={result} />
    </Drawer>
  );
}
