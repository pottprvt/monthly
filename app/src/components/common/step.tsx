import { CheckIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "upcoming";

/** One row of a vertical step list: number or check, title, and content while current. */
export function Step({
  n,
  title,
  state,
  children,
  last = false,
}: {
  n: number;
  title: string;
  state: StepState;
  children?: ReactNode;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      {!last && <span className="absolute top-8 bottom-0 left-[13px] w-px bg-border" aria-hidden />}
      <span
        className={cn(
          "z-10 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium",
          state === "done" && "border-foreground bg-foreground text-background",
          state === "current" && "border-foreground",
          state === "upcoming" && "text-muted-foreground",
        )}
      >
        {state === "done" ? <CheckIcon className="size-3.5" /> : n}
      </span>
      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-7")}>
        <div className={cn("pt-1 text-sm font-medium", state === "upcoming" && "text-muted-foreground")}>{title}</div>
        {children && state === "current" && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
