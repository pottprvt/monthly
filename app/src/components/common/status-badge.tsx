import type { MemberStatus } from "@/lib/chain";
import { cn } from "@/lib/utils";

const STYLES: Record<MemberStatus | "closed", { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/12 text-success" },
  due: { label: "Payment due", className: "bg-warning/15 text-warning" },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, className }: { status: MemberStatus | "closed"; className?: string }) {
  const s = STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", s.className, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
