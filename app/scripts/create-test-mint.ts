/**
 * One-off: creates the devnet "test USDC" mint (6 decimals) with the faucet wallet as mint authority.
 * Usage: FAUCET_KEYPAIR="$(cat ~/.config/solana/monthly-faucet.json)" npx tsx scripts/create-test-mint.ts
 */
import { createMint } from "@solana/spl-token";
import { Connection, Keypair } from "@solana/web3.js";

async function main() {
  const faucet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.FAUCET_KEYPAIR!)));
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const mint = await createMint(connection, faucet, faucet.publicKey, null, 6);
  console.log(mint.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
