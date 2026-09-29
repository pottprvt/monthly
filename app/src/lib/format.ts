import { USDC_DECIMALS } from "./config";

export const INTERVALS = [
  { label: "Minute", unit: "min", seconds: 60 },
  { label: "Day", unit: "day", seconds: 86_400 },
  { label: "Week", unit: "week", seconds: 7 * 86_400 },
  { label: "Month", unit: "month", seconds: 30 * 86_400 },
] as const;

/** "/ month", "/ min", … */
export function perInterval(seconds: number): string {
  const hit = INTERVALS.find((i) => i.seconds === seconds);
  if (hit) return `/ ${hit.unit}`;
  if (seconds % 86_400 === 0) return `/ ${seconds / 86_400} days`;
  return `/ ${seconds}s`;
}

type Amount = bigint | number | { toString(): string };

export function formatUsdc(baseUnits: Amount): string {
  const n = Number(typeof baseUnits === "object" ? baseUnits.toString() : baseUnits) / 10 ** USDC_DECIMALS;
  return n.toLocaleString("en-US", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
}

/** Parses a user-entered USDC amount into base units; returns null for invalid or non-positive input. */
export function parseUsdc(input: string): bigint | null {
  const clean = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{0,6})?$/.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  const value = BigInt(whole) * BigInt(10 ** USDC_DECIMALS) + BigInt((frac + "000000").slice(0, USDC_DECIMALS));
  return value > 0n ? value : null;
}

export function shortAddress(addr: string, n = 4): string {
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

export function timeUntil(unix: number, now: number): string {
  const diff = unix - now;
  if (diff <= 0) return "now";
  if (diff < 120) return `in ${diff}s`;
  if (diff < 3600) return `in ${Math.ceil(diff / 60)} min`;
  if (diff < 86_400) return `in ${Math.round(diff / 3600)} h`;
  return `in ${Math.round(diff / 86_400)} days`;
}

export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}
