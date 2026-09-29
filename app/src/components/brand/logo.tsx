import Link from "next/link";

import { cn } from "@/lib/utils";

/** Mark: a circular arrow closing into a dot, i.e. "repeats on schedule". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-foreground" />
      <path
        d="M22.5 12.2A7.5 7.5 0 1 0 23.5 16"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="stroke-background"
      />
      <circle cx="23.5" cy="16" r="2.3" className="fill-brand" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="text-[1.05rem]">Monthly</span>
    </Link>
  );
}
