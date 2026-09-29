"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { WalletButton } from "@/components/wallet/wallet-button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/subscriptions", label: "My subscriptions" },
];

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                path.startsWith(n.href) && "text-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden rounded-full border px-2 py-0.5 text-xs text-muted-foreground sm:inline">Devnet</span>
          <WalletButton />
        </div>
      </div>
      <nav className="flex gap-1 border-t px-2 py-1.5 text-sm sm:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "rounded-md px-3 py-1 text-muted-foreground",
              path.startsWith(n.href) && "bg-muted text-foreground",
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
