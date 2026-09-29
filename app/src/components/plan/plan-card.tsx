import { ArrowDownIcon, LockIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PlanAvatar } from "./plan-avatar";

export type PlanView = { name: string; image: string; price: string; per: string; by?: string };

/** What a buyer sees: the product, the price and the two price guarantees. Used for previews too. */
export function PlanCard({ plan, footer, className }: { plan: PlanView; footer?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-6 shadow-xs", className)}>
      <div className="flex items-center gap-3">
        <PlanAvatar image={plan.image} name={plan.name} className="size-12 text-xl" />
        <div className="min-w-0">
          <div className="truncate font-semibold">{plan.name || "Plan name"}</div>
          {plan.by && <div className="truncate text-xs text-muted-foreground">by {plan.by}</div>}
        </div>
      </div>
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">{plan.price}</span>
        <span className="text-sm text-muted-foreground">USDC {plan.per}</span>
      </div>
      <ul className="mt-5 space-y-2 border-t pt-5 text-sm">
        <li className="flex items-center gap-2.5">
          <LockIcon className="size-4 text-muted-foreground" />
          No price increase without your approval
        </li>
        <li className="flex items-center gap-2.5">
          <ArrowDownIcon className="size-4 text-muted-foreground" />
          Price cuts apply to you automatically
        </li>
      </ul>
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}
