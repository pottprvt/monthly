import { PublicKey } from "@solana/web3.js";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

/** Circle's devnet USDC. Faucet: https://faucet.circle.com */
export const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
export const USDC_DECIMALS = 6;

export const EXPLORER = "https://explorer.solana.com";

export function explorerTx(sig: string) {
  return `${EXPLORER}/tx/${sig}?cluster=devnet`;
}

export function explorerAddress(addr: string) {
  return `${EXPLORER}/address/${addr}?cluster=devnet`;
}

export const INTERVALS: { label: string; seconds: number }[] = [
  { label: "every minute (demo)", seconds: 60 },
  { label: "hourly", seconds: 3600 },
  { label: "daily", seconds: 86400 },
  { label: "weekly", seconds: 7 * 86400 },
  { label: "monthly", seconds: 30 * 86400 },
];

export function intervalLabel(seconds: number): string {
  const hit = INTERVALS.find((i) => i.seconds === seconds);
  if (hit) return hit.label.replace(" (demo)", "");
  if (seconds % 86400 === 0) return `every ${seconds / 86400} days`;
  if (seconds % 3600 === 0) return `every ${seconds / 3600} hours`;
  return `every ${seconds} seconds`;
}

export function formatUsdc(baseUnits: bigint | number): string {
  const n = Number(baseUnits) / 10 ** USDC_DECIMALS;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
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
