import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { explorerAddress, explorerTx, shortAddress } from "@/lib/config";
import type { TxResult } from "@/lib/hooks";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-panel p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-3 text-base" }[size];
  const styles = {
    primary: "bg-accent text-white hover:bg-accent-strong",
    ghost: "border border-line bg-panel hover:bg-panel-strong",
    danger: "border border-danger/40 text-danger hover:bg-danger/10",
  }[variant];
  return <button className={`${base} ${sizes} ${styles} ${className}`} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent";

export function Badge({ tone, children }: { tone: "ok" | "warn" | "off" | "accent"; children: ReactNode }) {
  const styles = {
    ok: "bg-ok/15 text-ok",
    warn: "bg-warn/15 text-warn",
    off: "bg-panel-strong text-muted",
    accent: "bg-accent/15 text-accent",
  }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="mb-6 flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
            active === t.id ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-2 rounded-full bg-panel-strong px-1.5 text-xs text-muted">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-line bg-panel p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-fg" aria-label="Close panel">
            ✕
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-strong">
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
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

export function Notice({ tone, children }: { tone: "ok" | "error" | "info"; children: ReactNode }) {
  const styles = {
    ok: "border-ok/40 bg-ok/10",
    error: "border-danger/40 bg-danger/10",
    info: "border-line bg-panel-strong",
  }[tone];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function ResultNotice({ result }: { result: TxResult | null }) {
  if (!result) return null;
  return (
    <Notice tone={result.ok ? "ok" : "error"}>
      {result.text}{" "}
      {result.sig && (
        <a href={explorerTx(result.sig)} target="_blank" rel="noreferrer" className="text-accent underline">
          view transaction
        </a>
      )}
    </Notice>
  );
}

export function Empty({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {title && <div className="font-medium">{title}</div>}
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-accent underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

export function timeUntil(unix: number, now: number): string {
  const diff = unix - now;
  if (diff <= 0) return "due now";
  if (diff < 60) return `in ${diff}s`;
  if (diff < 3600) return `in ${Math.ceil(diff / 60)} min`;
  if (diff < 86400) return `in ${Math.round(diff / 3600)} h`;
  return `in ${Math.round(diff / 86400)} d`;
}

export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}
