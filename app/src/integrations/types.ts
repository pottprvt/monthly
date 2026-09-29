/**
 * Community integrations give plan members access to a chat (Telegram group, Discord role)
 * while their subscription is active. See docs/INTEGRATIONS.md for flows and security rules.
 */
export type ProviderId = "telegram" | "discord";

/** What the UI needs to know about a provider. Safe to send to the browser. */
export type ProviderInfo = {
  id: ProviderId;
  name: string;
  /** Short noun for what a creator connects, e.g. "group" or "server". */
  target: string;
  /** Label of the button a member uses to get access after subscribing. */
  memberCta: string;
  /** Steps shown to a creator when connecting. */
  setupSteps: string[];
  /** True when the server has the credentials this provider needs. */
  available: boolean;
};

/** Per plan and provider, as shown in the dashboard. */
export type ConnectionStatus = "not_configured" | "needs_setup" | "connected" | "error";

/** Per member and provider. */
export type AccessState = "pending" | "granted" | "revoked" | "error";
