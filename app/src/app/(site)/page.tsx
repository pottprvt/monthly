import { ArrowRightIcon, CalendarClockIcon, ShieldCheckIcon, UserCheckIcon, WalletIcon } from "lucide-react";
import Link from "next/link";

import { ProviderIcon } from "@/components/brand/provider-icons";
import { TelegramMock } from "@/components/marketing/telegram-mock";
import { PlanCard } from "@/components/plan/plan-card";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_PLAN } from "@/lib/config";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: CalendarClockIcon,
    title: "Collected automatically",
    text: "Members approve once. Every payment after that is pulled on schedule.",
  },
  {
    icon: UserCheckIcon,
    title: "Access follows payment",
    text: "Members who stop paying are removed from your group. Pay again, get back in.",
  },
  {
    icon: WalletIcon,
    title: "Straight to your wallet",
    text: "USDC lands in your wallet with every payment. No payouts, no platform balance.",
  },
];

const STEPS = [
  { title: "Create a plan", text: "Name, image and a monthly price." },
  { title: "Connect your group", text: "Add the Monthly bot to your Telegram group." },
  { title: "Share your link", text: "Members subscribe and join in one flow." },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <ProviderIcon id="telegram" className="size-4" />
            For Telegram groups · Discord coming soon
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Get paid every month for your community.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Members pay in USDC on Solana. Payments are collected on schedule, and access ends when payments stop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/create" className={buttonVariants({ size: "lg", className: "h-11 px-5" })}>
              Create your plan <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link href={`/p/${DEMO_PLAN}`} className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 px-5" })}>
              Try the demo
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <PlanCard
            className="w-[70%]"
            plan={{ name: "Alpha Signals", image: "preset:📈:#2f6fed", price: "10", per: "/ month", by: "@alphadesk" }}
          />
          <div className="relative z-10 -mt-5 ml-auto w-[80%] rounded-2xl shadow-lg">
            <TelegramMock />
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <f.icon className="size-5" />
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-2xl font-semibold tracking-tight">Live in three steps</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border p-5">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <h3 className="mt-3 font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-8 rounded-2xl border p-8 md:grid-cols-[1fr_1.4fr] md:p-10">
          <div>
            <ShieldCheckIcon className="size-5" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Fair for members, by design</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The rules live in the on-chain program, not on this website. Nobody can change them later.
            </p>
          </div>
          <dl className="grid gap-6 sm:grid-cols-2">
            {[
              ["Price goes up", "Members keep their price until they approve the new one."],
              ["Price goes down", "Every member pays less from the next payment."],
              ["Spending limit", "Members set a ceiling. It can never be exceeded."],
              ["Cancel anytime", "One click, or revoke the limit in any Solana wallet."],
            ].map(([t, d]) => (
              <div key={t}>
                <dt className="font-medium">{t}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className={cn("flex flex-col items-start justify-between gap-6 rounded-2xl bg-foreground px-8 py-10 text-background md:flex-row md:items-center")}>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Start charging for your community</h2>
            <p className="mt-1 text-background/70">Takes two minutes. Runs on Solana devnet with free test funds.</p>
          </div>
          <Link href="/create" className={buttonVariants({ size: "lg", variant: "secondary", className: "h-11 px-5" })}>
            Create your plan <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
      </section>
    </>
  );
}
