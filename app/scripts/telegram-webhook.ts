/**
 * Registers the Telegram webhook for a deployment (run once per domain, or after rotating the secret).
 * Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... npx tsx scripts/telegram-webhook.ts https://monthly-sol.vercel.app
 */
import { tg } from "../src/integrations/telegram/api";

async function main() {
  const origin = process.argv[2];
  if (!origin?.startsWith("https://")) throw new Error("Pass the deployment origin, e.g. https://monthly-sol.vercel.app");
  await tg("setWebhook", {
    url: `${origin}/api/integrations/telegram/webhook`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "my_chat_member", "chat_join_request"],
    drop_pending_updates: true,
  });
  await tg("setMyCommands", { commands: [{ command: "start", description: "Link your wallet or connect a group" }] });
  console.log(await tg("getWebhookInfo"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
