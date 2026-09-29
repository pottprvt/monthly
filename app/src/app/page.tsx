import Link from "next/link";

import { Card } from "@/components/ui";
import { DEMO_PLAN } from "@/lib/demo";

const steps = [
  {
    title: "Create a plan",
    text: "Name, price in USDC, billing interval. Charges can only ever land in the merchant's account.",
  },
  {
    title: "Approve a mandate",
    text: "The subscriber signs once: a spending ceiling for the Monthly program and the first payment. Nothing is prepaid.",
  },
  {
    title: "Get paid on schedule",
    text: "When a period is due, the program pulls exactly the plan amount. Cancel or revoke any time, from any wallet.",
  },
];

const guarantees = [
  "Only the plan amount, only once per period, only to the merchant.",
  "The subscriber sets a hard ceiling and can revoke it in any wallet.",
  "A failed payment is retried for three days, then the subscription pauses.",
  "The rules live in the on-chain program, not on this website.",
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Recurring payments on Solana
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Direct debit for USDC.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Solana has no way to charge someone every month. Monthly adds it: subscribers approve a
            mandate once, the program collects when a payment is due, and either side can walk away
            any time.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/merchant"
              className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-strong"
            >
              I sell a subscription
            </Link>
            <Link
              href="/me"
              className="rounded-lg border border-line bg-panel px-5 py-3 text-sm font-medium hover:bg-panel-strong"
            >
              My subscriptions
            </Link>
          </div>
        </div>

        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted">Live demo on devnet</span>
            <span className="rounded-full bg-ok/15 px-2 py-0.5 text-xs font-medium text-ok">active</span>
          </div>
          <div>
            <div className="text-xl font-semibold">Demo: Alpha Signals</div>
            <div className="text-muted">1.00 test USDC every minute</div>
          </div>
          <p className="text-sm text-muted">
            Subscribe with a devnet wallet and watch the charges arrive minute by minute. Use{" "}
            <span className="text-fg">Get test funds</span> at the top for free test USDC.
          </p>
          <Link
            href={`/p/${DEMO_PLAN}`}
            className="block rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-accent-strong"
          >
            Try the demo plan →
          </Link>
        </Card>
      </section>

      <section>
        <h2 className="mb-5 text-xl font-semibold">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.title}>
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                {i + 1}
              </div>
              <h3 className="mb-1 font-medium">{s.title}</h3>
              <p className="text-sm text-muted">{s.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xl font-semibold">Why it is safe</h2>
          <p className="text-sm text-muted">
            Monthly uses the token program&apos;s own delegate feature. The subscriber keeps the
            funds; the program can only move what the plan says, when the plan says.
          </p>
        </div>
        <ul className="space-y-3">
          {guarantees.map((g) => (
            <li key={g} className="flex gap-3 text-sm">
              <span className="mt-0.5 text-ok">✓</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
