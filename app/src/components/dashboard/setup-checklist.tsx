import { CheckIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Item = { label: string; done: boolean; href?: string; note?: string };

/** Onboarding progress on the overview until the creator has a plan and a first member. */
export function SetupChecklist({ items }: { items: Item[] }) {
  const done = items.filter((i) => i.done).length;
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Get started</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {done} of {items.length}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const row = (
            <span className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full border",
                  item.done && "border-success bg-success text-background",
                )}
              >
                {item.done && <CheckIcon className="size-3" />}
              </span>
              <span className={cn(item.done && "text-muted-foreground line-through")}>{item.label}</span>
              {item.note && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.note}</span>}
            </span>
          );
          return <li key={item.label}>{item.href && !item.done ? <Link href={item.href} className="hover:underline">{row}</Link> : row}</li>;
        })}
      </ul>
    </div>
  );
}
