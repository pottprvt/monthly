# Community integrations (Telegram, Discord)

Members get access to a creator's chat while their subscription is active and lose it when it is paused, cancelled or the plan is closed. The on-chain program is the only source of truth for "is this subscription active"; the integration layer only mirrors it.

Status: the provider registry (`app/src/integrations`) and `GET /api/integrations` exist; the flows below are the build plan for the bots.

## Principles

- **Never trust the client.** Wallet addresses come only from a verified wallet signature (Sign-In With Solana), never from a request body. Subscription state is always read on-chain by the server.
- **Idempotent reconciliation.** One function, `syncAccess()`, compares desired state (from chain) with actual state (from the store) and calls `grant` / `revoke`. It runs after each charge job and on demand after a member's transaction.
- **Least privilege.** Telegram bot: only `can_invite_users` and `can_restrict_members`. Discord bot: only Manage Roles and Create Instant Invite. No administrator rights.
- **One account per subscription.** Linking a new Telegram/Discord account to a subscription revokes the previous one.

## Storage

Upstash Redis via the Vercel Marketplace (atomic `SET NX` / `GETDEL` with TTL for one-time codes and nonces; works from Vercel functions and the GitHub Action). Vercel Blob and Global Config are unsuitable for this data.

| Key | Value | TTL |
|---|---|---|
| `nonce:{n}` | 1, consumed with GETDEL | 5 min |
| `code:{c}` | `{kind, planId, wallet, subscription?}` for bot deep links, GETDEL | 10 min |
| `oauth:{state}` | `{kind, planId, wallet}`, GETDEL | 10 min |
| `conn:{plan}:{provider}` | `{targetId, targetName, roleId?, inviteLink?, status, error?, checkedAt}` | – |
| `target:{provider}:{targetId}` | plan (reverse lookup for webhooks) | – |
| `id:{provider}:{wallet}` / `idr:{provider}:{extId}` | linked account | – |
| `grant:{subscription}:{provider}` | `{extId, state, updatedAt, error?}` | – |
| `grants:{plan}` | set of subscription addresses | – |
| `seen:tg:{update_id}` | 1 (webhook dedup) | 1 day |

## Flows

Every flow starts with a wallet proof: server nonce, SIWS message with domain, `chainId: devnet`, expiry ≤ 5 min and the action in `resources`; verified server-side; result is an HttpOnly session cookie.

**Creator connects a Telegram group**
1. Server checks `session.wallet == plan.merchant` on-chain, creates a one-time code, UI shows `t.me/<bot>?start=<code>`.
2. The bot redeems the code, binds the creator's Telegram id to the plan and sends a "choose group" button (`KeyboardButtonRequestChat`, supergroups only, requesting `can_invite_users` + `can_restrict_members` for the bot).
3. On `chat_shared` the server verifies chat type, bot rights and that the creator is an admin, then creates the plan's invite link with `creates_join_request: true` and stores the connection. `my_chat_member` updates flip the connection to `error` if rights are removed.

**Member gets Telegram access**
1. Wallet proof, on-chain check that the subscription is active, one-time code, UI shows `t.me/<bot>?start=<code>`.
2. The bot links the Telegram id to the wallet and sends the plan's join-request link.
3. On `chat_join_request` the bot approves only linked accounts with an active subscription to that plan and declines everyone else. A forwarded link is useless to others.

**Creator connects a Discord server**
OAuth2 with `scope=bot identify` and minimal permissions; the guild id is taken from the token response, never the query. The bot creates the role "Monthly · <plan>"; the creator restricts paid channels to that role.

**Member gets Discord access**
Wallet proof, OAuth2 `identify guilds.join`, then `PUT /guilds/{g}/members/{u}` with the role (plus an idempotent role PUT if already a member). The user token is discarded.

**Revoke / restore**
Desired access = subscription account exists, status Active, `now < next_charge_at + grace`. Telegram: `banChatMember` then `unbanChatMember(only_if_banned)` (removed, not banned). Discord: remove the role. Plan closed: revoke all, revoke the invite link. On resume: Discord re-adds the role; Telegram DMs the join link again.

## Module layout

```
app/src/integrations/types.ts          shared types (ProviderInfo, ConnectionStatus, AccessState)
app/src/integrations/registry.ts       provider list + availability from env (server-only)
app/src/integrations/telegram/*        provider, Bot API client, webhook handler
app/src/integrations/discord/*         provider, REST client, OAuth, Ed25519 verification
app/src/server/store.ts                typed Redis access, the only place with key strings
app/src/server/auth/wallet-proof.ts    nonce, SIWS verification, session cookie
app/src/server/access/sync.ts          syncAccess(), no next/* imports so the charge job can call it
app/src/app/api/integrations/[provider]/{connect,link,callback,webhook}/route.ts
app/src/app/api/access/refresh/route.ts
```

Provider contract (server side):

```ts
interface AccessProvider {
  id: ProviderId;
  startConnect(c: { plan: string; merchant: string }): Promise<{ url: string }>;
  startMemberLink(c: { plan: string; wallet: string; subscription: string }): Promise<{ url: string }>;
  handleWebhook(req: Request): Promise<Response>;   // authenticates itself
  handleCallback?(req: Request): Promise<Response>;
  grant(t: GrantTarget): Promise<AccessState>;       // idempotent
  revoke(t: GrantTarget): Promise<AccessState>;      // idempotent
  health(conn: PlanConnection): Promise<{ status: ConnectionStatus; detail?: string }>;
}
```

## Security checklist

- Telegram webhook: `secret_token` checked in constant time via `X-Telegram-Bot-Api-Secret-Token`; `allowed_updates` limited to `message, my_chat_member, chat_member, chat_join_request`; `update_id` dedup.
- Discord: Ed25519 verification of `timestamp + rawBody`, reject old timestamps, answer PING; only needed once slash commands exist.
- OAuth `state` single-use and bound to wallet + plan.
- Rate limits per IP and wallet on all routes; respect `retry_after` from Telegram and Discord.
- Secrets only in server env / GitHub secrets, never `NEXT_PUBLIC_`, never logged.

Environment: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.

References: Telegram Bot API (setWebhook, createChatInviteLink, chat_join_request, banChatMember, KeyboardButtonRequestChat, deep linking), Discord developer docs (OAuth2, guild members, permissions, interactions), Sign-In With Solana (phantom/sign-in-with-solana), Vercel Redis docs.
