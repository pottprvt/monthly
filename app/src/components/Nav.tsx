"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { FaucetButton } from "./FaucetButton";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

const links = [
  { href: "/merchant", label: "Merchant" },
  { href: "/me", label: "My subscriptions" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Monthly
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={path.startsWith(l.href) ? "text-fg" : "text-muted hover:text-fg"}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-xs text-muted">
          devnet
        </span>
        <FaucetButton />
        <WalletMultiButton />
      </div>
    </header>
  );
}
