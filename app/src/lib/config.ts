import { PublicKey } from "@solana/web3.js";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

/**
 * Devnet test USDC (6 decimals). Its mint authority is the Monthly faucet wallet, so anyone can
 * get test funds from the app without an external faucet.
 */
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ?? "FbLav7StPpMyLdSBDhrsDNJQ3XbimxW5isbUY5CtWVFw",
);
export const USDC_DECIMALS = 6;

/** Always-on demo plan (1 test USDC per minute), owned by the Monthly demo merchant. */
export const DEMO_PLAN = "2SkdzDedm7py8Y9PvBGwJ9ec3cEyuiXbc2vpubihbeQQ";

const EXPLORER = "https://explorer.solana.com";

export const explorerTx = (sig: string) => `${EXPLORER}/tx/${sig}?cluster=devnet`;
export const explorerAddress = (addr: string) => `${EXPLORER}/address/${addr}?cluster=devnet`;
