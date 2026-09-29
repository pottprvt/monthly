/* eslint-disable @next/next/no-img-element -- creator images come from arbitrary hosts */
import { parseImage } from "@/lib/plan-image";
import { cn } from "@/lib/utils";

export function PlanAvatar({ image, name, className }: { image: string; name: string; className?: string }) {
  const parsed = parseImage(image);
  const base = cn("grid size-10 shrink-0 place-items-center overflow-hidden rounded-[28%]", className);
  if (parsed.kind === "url") return <img src={parsed.url} alt="" className={cn(base, "object-cover")} />;
  if (parsed.kind === "preset") {
    return (
      <div className={base} style={{ background: parsed.color }}>
        <span className="text-[1.15em] leading-none">{parsed.emoji}</span>
      </div>
    );
  }
  return <div className={cn(base, "bg-muted font-semibold text-muted-foreground")}>{(name.trim()[0] ?? "M").toUpperCase()}</div>;
}
