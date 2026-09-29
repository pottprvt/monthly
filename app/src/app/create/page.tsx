"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowRightIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { CommunityConnections } from "@/components/plan/community-connections";
import { PlanCard } from "@/components/plan/plan-card";
import { EMPTY_DRAFT, PlanForm, isDraftValid, type PlanDraft } from "@/components/plan/plan-form";
import { ShareLink } from "@/components/plan/share-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConnectGate } from "@/components/wallet/connect-gate";
import { useTestFunds } from "@/components/wallet/use-test-funds";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useCreatorData } from "@/hooks/use-creator-data";
import { useProgram } from "@/hooks/use-program";
import { useTx } from "@/hooks/use-tx";
import { createPlanIx, planPda } from "@/lib/chain";
import { formatUsdc, parseUsdc, perInterval, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = ["Plan", "Community", "Share"] as const;

export default function CreatePage() {
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<string | null>(null);

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Logo href="/dashboard" />
          <ol className="mx-auto hidden items-center gap-2 text-sm sm:flex">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-xs",
                    i < step && "border-foreground bg-foreground text-background",
                    i === step && "border-foreground font-medium",
                    i > step && "text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn(i > step && "text-muted-foreground")}>{label}</span>
                {i < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-border" />}
              </li>
            ))}
          </ol>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <WalletButton />
            <Link href="/dashboard" aria-label="Close" className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <XIcon />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="mb-6 text-xs text-muted-foreground sm:hidden">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
        <ConnectGate title="Connect your wallet" description="Payments for your plan go straight to this wallet.">
          {step === 0 && (
            <PlanStep
              onCreated={(plan) => {
                setCreated(plan);
                setStep(1);
              }}
            />
          )}
          {step === 1 && (
            <div className="mx-auto max-w-2xl space-y-8">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Connect your community</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Members get access while they pay and are removed when they stop.
                </p>
              </div>
              <CommunityConnections plan={created ?? undefined} />
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>
                  Continue <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}
          {step === 2 && created && (
            <div className="mx-auto max-w-2xl space-y-8">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Your plan is live</h1>
                <p className="mt-1 text-sm text-muted-foreground">Share this link. Members subscribe in one step.</p>
              </div>
              <ShareLink plan={created} />
              <div className="flex flex-wrap justify-end gap-2">
                <Link href={`/p/${created}`} className={buttonVariants({ variant: "outline" })}>
                  Test as a member
                </Link>
                <Link href={`/dashboard/plans/${created}`} className={buttonVariants()}>
                  Go to dashboard
                </Link>
              </div>
            </div>
          )}
        </ConnectGate>
      </main>
    </div>
  );
}

function PlanStep({ onCreated }: { onCreated: (plan: string) => void }) {
  const { publicKey } = useWallet();
  const program = useProgram();
  const { busy, run } = useTx();
  const funds = useTestFunds();
  const { loaded, hasUsdc, nextPlanId } = useCreatorData();
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);
  const amount = parseUsdc(draft.price);

  async function create() {
    if (!publicKey || amount === null) return;
    const ok = await run(
      "create",
      async () => [await createPlanIx(program, publicKey, nextPlanId, { name: draft.name.trim(), image: draft.image, amount }, draft.interval)],
      "Plan created",
    );
    if (ok) onCreated(planPda(publicKey, nextPlanId).toBase58());
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create your plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">This is what members see and pay.</p>
        </div>
        <PlanForm draft={draft} onChange={setDraft} />
        {loaded && hasUsdc === false && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">Your wallet needs a test USDC account to receive payments.</span>
            <Button size="sm" variant="outline" onClick={() => funds.request()} disabled={funds.busy}>
              {funds.busy ? "Sending…" : "Get test funds"}
            </Button>
          </div>
        )}
        <Button
          size="lg"
          className="h-11 w-full sm:w-auto sm:px-8"
          onClick={create}
          disabled={!loaded || !hasUsdc || !isDraftValid(draft) || nextPlanId === 0 || busy !== null}
        >
          {busy ? "Confirm in your wallet…" : "Create plan"}
        </Button>
      </div>
      <div className="lg:sticky lg:top-10 lg:self-start">
        <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Preview</div>
        <PlanCard
          plan={{
            name: draft.name,
            image: draft.image,
            price: amount !== null ? formatUsdc(amount) : "–",
            per: perInterval(draft.interval),
            by: publicKey ? shortAddress(publicKey.toBase58()) : undefined,
          }}
          footer={<div className="rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground">Subscribe</div>}
        />
      </div>
    </div>
  );
}
