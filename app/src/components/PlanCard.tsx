import type { ReactNode } from "react";

import { ArrowDownIcon, LockIcon } from "./icons";
import { PlanAvatar } from "./PlanAvatar";

export type PlanView = { name: string; image: string; price: string; per: string };

/** The visual subscription card, used for the live preview, plan pages and lists. */
export function PlanCard({
  plan,
  badge,
  footer,
  large = false,
}: {
  plan: PlanView;
  badge?: ReactNode;
  footer?: ReactNode;
  large?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <PlanAvatar image={plan.image} name={plan.name} size={large ? 64 : 52} />
        {badge}
      </div>
      <div className="relative mt-5">
        <div className={`${large ? "text-2xl" : "text-lg"} font-semibold tracking-tight`}>
          {plan.name || "Your plan name"}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={`${large ? "text-5xl" : "text-4xl"} font-semibold tabular-nums tracking-tight`}>
            {plan.price}
          </span>
          <span className="text-muted">USDC {plan.per}</span>
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-2.5 py-1 text-ok">
          <LockIcon size={13} /> No increase without your OK
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-accent">
          <ArrowDownIcon size={13} /> Price cuts apply instantly
        </span>
      </div>
      {footer && <div className="relative mt-6">{footer}</div>}
    </div>
  );
}
