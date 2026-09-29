import Link from "next/link";

import { ArrowDownIcon, ArrowRightIcon, CheckIcon, ClockIcon, LockIcon, XIcon } from "@/components/icons";
import { PlanCard } from "@/components/PlanCard";
import { DEMO_PLAN } from "@/lib/demo";

const features = [
  { icon: <CheckIcon />, title: "Approve once", text: "One signature. No monthly clicking." },
  { icon: <ClockIcon />, title: "Paid on time", text: "Collected automatically when due." },
  { icon: <LockIcon />, title: "No surprise hikes", text: "Higher prices need your signature." },
  { icon: <XIcon />, title: "Cancel anytime", text: "One click, or revoke in any wallet." },
];

export default function Home() {
  return (
    <div className="space-y-20">
      <section className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Subscriptions
            <br />
            <span className="text-accent">on Solana.</span>
          </h1>
          <p className="max-w-md text-xl text-muted">Approve once. Pay on schedule. Cancel anytime.</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/merchant"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-medium text-white hover:bg-accent-strong"
            >
              Create a plan <ArrowRightIcon size={16} />
            </Link>
            <Link
              href={`/p/${DEMO_PLAN}`}
              className="rounded-xl border border-line bg-panel px-6 py-3.5 font-medium hover:bg-panel-strong"
            >
              Try the demo
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-accent/20 via-transparent to-ok/10 blur-2xl" />
          <PlanCard
            large
            plan={{ name: "Alpha Signals", image: "preset:📈:#7c6dff", price: "1", per: "/ min" }}
            badge={<span className="rounded-full bg-ok/15 px-2.5 py-1 text-xs font-medium text-ok">live demo</span>}
            footer={
              <Link
                href={`/p/${DEMO_PLAN}`}
                className="block rounded-xl bg-accent py-3 text-center text-sm font-medium text-white hover:bg-accent-strong"
              >
                Subscribe
              </Link>
            }
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">{f.icon}</div>
            <div className="font-medium">{f.title}</div>
            <div className="mt-1 text-sm text-muted">{f.text}</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-line bg-panel p-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted">Price goes up</div>
            <div className="mt-2 flex items-center gap-2 text-2xl font-semibold">
              10 <ArrowRightIcon className="text-muted" /> 12 <span className="text-base text-muted">USDC</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-warn">
              <LockIcon size={14} /> you keep paying 10 until you accept
            </div>
          </div>
          <div>
            <div className="text-sm text-muted">Price goes down</div>
            <div className="mt-2 flex items-center gap-2 text-2xl font-semibold">
              10 <ArrowRightIcon className="text-muted" /> 8 <span className="text-base text-muted">USDC</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent">
              <ArrowDownIcon size={14} /> you pay 8 from the next payment
            </div>
          </div>
          <div>
            <div className="text-sm text-muted">Enforced by</div>
            <div className="mt-2 text-2xl font-semibold">the program</div>
            <div className="mt-2 text-sm text-muted">Not by this website. Not by the merchant.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
