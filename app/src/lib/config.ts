import { PublicKey } from "@solana/web3.js";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

/**
 * Devnet test USDC (6 decimals). Mint authority is the Monthly faucet wallet, so anyone can get
 * test funds from the app without an external faucet.
 */
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ?? "FbLav7StPpMyLdSBDhrsDNJQ3XbimxW5isbUY5CtWVFw",
);
export const USDC_DECIMALS = 6;

const EXPLORER = "https://explorer.solana.com";

export function explorerTx(sig: string) {
  return `${EXPLORER}/tx/${sig}?cluster=devnet`;
}

export function explorerAddress(addr: string) {
  return `${EXPLORER}/address/${addr}?cluster=devnet`;
}

export const INTERVALS: { label: string; short: string; seconds: number }[] = [
  { label: "Minute", short: "min", seconds: 60 },
  { label: "Day", short: "day", seconds: 86400 },
  { label: "Week", short: "week", seconds: 7 * 86400 },
  { label: "Month", short: "month", seconds: 30 * 86400 },
];

/** "/ month", "/ min", ... */
export function perInterval(seconds: number): string {
  const hit = INTERVALS.find((i) => i.seconds === seconds);
  if (hit) return `/ ${hit.short}`;
  if (seconds % 86400 === 0) return `/ ${seconds / 86400} days`;
  if (seconds % 3600 === 0) return `/ ${seconds / 3600} h`;
  return `/ ${seconds}s`;
}

/** "every month", "every minute", ... */
export function intervalLabel(seconds: number): string {
  const hit = INTERVALS.find((i) => i.seconds === seconds);
  if (hit) return `every ${hit.label.toLowerCase()}`;
  if (seconds % 86400 === 0) return `every ${seconds / 86400} days`;
  if (seconds % 3600 === 0) return `every ${seconds / 3600} hours`;
  return `every ${seconds} seconds`;
}

export function formatUsdc(baseUnits: bigint | number | { toString(): string }): string {
  const n = Number(typeof baseUnits === "object" ? baseUnits.toString() : baseUnits) / 10 ** USDC_DECIMALS;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function parseUsdc(input: string): bigint {
  const [whole, frac = ""] = input.trim().replace(",", ".").split(".");
  const fracPadded = (frac + "000000").slice(0, USDC_DECIMALS);
  return BigInt(whole || "0") * BigInt(10 ** USDC_DECIMALS) + BigInt(fracPadded);
}

export function shortAddress(addr: string, n = 4) {
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}
