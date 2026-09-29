import "server-only";

import type { ProviderId, ProviderInfo } from "./types";

type Definition = Omit<ProviderInfo, "available"> & { requiredEnv: string[] };

/** Adding a provider: one entry here plus its module under src/integrations/<id>/. */
const definitions: Record<ProviderId, Definition> = {
  telegram: {
    id: "telegram",
    name: "Telegram",
    target: "group",
    memberCta: "Join on Telegram",
    setupSteps: ["Open the Monthly bot", "Pick your group and allow invites and removals", "Done: members join through the bot"],
    requiredEnv: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_USERNAME", "TELEGRAM_WEBHOOK_SECRET"],
  },
  discord: {
    id: "discord",
    name: "Discord",
    target: "server",
    memberCta: "Join on Discord",
    setupSteps: ["Add the Monthly bot to your server", "A member role is created for this plan", "Limit your paid channels to that role"],
    requiredEnv: ["DISCORD_APP_ID", "DISCORD_PUBLIC_KEY", "DISCORD_BOT_TOKEN", "DISCORD_CLIENT_SECRET"],
  },
};

export function listProviders(): ProviderInfo[] {
  return Object.values(definitions).map(({ requiredEnv, ...info }) => ({
    ...info,
    available: requiredEnv.every((key) => !!process.env[key]),
  }));
}
