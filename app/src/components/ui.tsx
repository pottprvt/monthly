import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { explorerAddress, explorerTx, shortAddress } from "@/lib/config";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-panel p-5 ${className}`}>
      {children}
    </section>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    primary: "bg-accent text-white hover:bg-accent-strong",
    ghost: "border border-line bg-transparent hover:bg-panel-strong",
    danger: "border border-danger/40 text-danger hover:bg-danger/10",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent";

export function Badge({ tone, children }: { tone: "ok" | "warn" | "off"; children: ReactNode }) {
  const styles = {
    ok: "bg-ok/15 text-ok",
    warn: "bg-warn/15 text-warn",
    off: "bg-panel-strong text-muted",
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>;
}

export function Address({ value }: { value: string }) {
  return (
    <a
      href={explorerAddress(value)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs text-muted underline-offset-2 hover:underline"
      title={value}
    >
      {shortAddress(value)}
    </a>
  );
}

export function TxLink({ sig }: { sig: string }) {
  return (
    <a href={explorerTx(sig)} target="_blank" rel="noreferrer" className="text-accent underline">
      view transaction
    </a>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "ok" | "error" | "info";
  children: ReactNode;
}) {
  const styles = {
    ok: "border-ok/40 bg-ok/10",
    error: "border-danger/40 bg-danger/10",
    info: "border-line bg-panel-strong",
  }[tone];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-accent underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

export function timeUntil(unix: number): string {
  const diff = unix - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "due now";
  if (diff < 3600) return `in ${Math.ceil(diff / 60)} min`;
  if (diff < 86400) return `in ${Math.round(diff / 3600)} h`;
  return `in ${Math.round(diff / 86400)} d`;
}

export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
