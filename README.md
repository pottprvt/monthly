# Monthly — paid communities on Solana

Get paid every month for your Telegram group. Members pay in USDC on Solana, payments are collected on schedule, and the Monthly bot lets paying members in and removes them when they stop paying.

Solana has no direct debit. Paid communities today run on credit cards (3 % fees, chargebacks, no wallet users) or on creators chasing members by hand. Monthly uses the token program's own delegate feature: a member approves a spending limit once, and from then on the Monthly program pulls the plan price when it is due. Nothing is prepaid; the money stays in the member's wallet until the day it is due.

Built for the Superteam Germany "Road to Colosseum: Build your MVP" bounty and the Colosseum Crypto World's Fair hackathon (September–October 2026).

## Try it

Live app (Solana devnet): **https://monthly-sol.vercel.app** · Telegram bot: **[@monthlysolbot](https://t.me/monthlysolbot)**

Set Phantom, Solflare or Backpack to devnet. Test funds come from the app itself (wallet menu → **Get test funds**: 100 test USDC, plus devnet SOL for fees if the wallet is empty).

**As a member**
1. Open the [demo plan](https://monthly-sol.vercel.app/p/2SkdzDedm7py8Y9PvBGwJ9ec3cEyuiXbc2vpubihbeQQ) (1 test USDC per minute) and subscribe: one signature sets the spending limit and pays the first period.
2. Keep **My subscriptions** open and watch a payment go through every minute.
3. Cancel any time, or revoke the spending limit in any wallet.

**As a creator**
1. **Create your plan** (`/create`): image, name, price, interval, with a live preview.
2. **Connect Telegram**: sign a short message, add the bot to your group, confirm its rights. The dashboard switches to "Connected".
3. Share the checkout link. Members subscribe, tap **Join on Telegram**, and the bot approves their join request. Cancelled or paused members are removed.

## How it works

### Payments (on-chain)

1. **Creator creates a plan**: name, image, price, interval. The plan stores the creator's token account, so charges can only land there.
2. **Member subscribes**: one transaction that approves the Monthly authority as delegate on the member's USDC account for a chosen limit (e.g. 12 payments) and collects the first period.
3. **Charges**: once a period has passed, anyone may call `charge`; the program checks the limit and balance and moves exactly the price to the creator. A charge that cannot be covered is retried during a three-day grace period, then the subscription pauses.
4. **Member stays in control**: cancel any time (account closed, rent returned), revoke the delegate in any wallet, resume a paused subscription once funds are back.

Collection is triggered by the app whenever a payment is due while someone has it open (`POST /api/collect`), and by a scheduled job every five minutes (`POST /api/cron/charge`, called from a GitHub Action). Both only pay the transaction fee; the program decides what moves.

### Price rule

Every subscription stores the price the member signed for. A charge always takes the lower of that agreed price and the plan's current price:

- **Price cut**: applies to every member at the next payment, automatically.
- **Price increase**: applies to new members only. Existing members keep their price until they sign `accept_price`.

The billing interval is immutable, because a shorter interval would be a hidden price increase.

What the program guarantees regardless of any website:

- Only min(agreed price, current price), only once per period, only to the plan's creator account.
- No price increase without the member's signature; the spending limit is a hard ceiling.
- Only the member can cancel or resume; only the creator can edit or close a plan.

### Community access (Telegram)

1. **Wallet proof**: the member (or creator) signs a sign-in message with a server nonce; the server verifies the ed25519 signature and issues an HttpOnly session. Wallet addresses from requests are never trusted without it.
2. **Creator connects a group**: the server checks on-chain that the signed-in wallet owns the plan and returns a one-time `t.me/monthlysolbot?startgroup=<code>` link that requests only "invite users" and "ban users". The bot verifies the adder is a group admin and that it has these rights, then creates the plan's join-request link.
3. **Member links Telegram**: the server checks on-chain that the signed-in wallet has an active subscription and returns a one-time `t.me/monthlysolbot?start=<code>` link. The bot binds that Telegram account to the wallet and sends the join-request link.
4. **Join requests** are approved only for Telegram accounts linked to a wallet with an active subscription to that exact plan; everyone else is declined. A forwarded link is useless.
5. **Access follows payment**: on cancel, pause or plan close the member is removed (ban and immediate unban, so they can rejoin later) and notified; on resume they get the link again. The sync runs right after member actions and in the scheduled job.

Discord is prepared in the provider registry and specified in [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

## Devnet addresses

| What | Address |
|---|---|
| Program | [`6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ`](https://explorer.solana.com/address/6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ?cluster=devnet) |
| Spending-limit authority | PDA `["authority"]` of the program |
| Test USDC mint (6 decimals) | [`FbLav7StPpMyLdSBDhrsDNJQ3XbimxW5isbUY5CtWVFw`](https://explorer.solana.com/address/FbLav7StPpMyLdSBDhrsDNJQ3XbimxW5isbUY5CtWVFw?cluster=devnet) |
| Demo plan | [`2SkdzDedm7py8Y9PvBGwJ9ec3cEyuiXbc2vpubihbeQQ`](https://explorer.solana.com/address/2SkdzDedm7py8Y9PvBGwJ9ec3cEyuiXbc2vpubihbeQQ?cluster=devnet) |
| Telegram bot | [@monthlysolbot](https://t.me/monthlysolbot) |

Example transactions from the devnet end-to-end run (`app/scripts/e2e.ts`):

| Step | Transaction |
|---|---|
| create plan | [3ZF3196m…](https://explorer.solana.com/tx/3ZF3196mgPX3MLMkGvCZgQnt8rWB3gP3AcsKcUvCZDXYkkAPcPwij9UVx33YSDoBQFGErhW96uzxcVfsAnrUJhpB?cluster=devnet) |
| approve spending limit + subscribe | [54D19pnC…](https://explorer.solana.com/tx/54D19pnCY6VWM8Q663L5w64yT5wxNVCqLH5Wx7Cn9wLuzMQmdAx3BFR7SDVXDLTdAwUQumQM6mPLMXqNCpfmX9Ld?cluster=devnet) |
| charge when due | [3FqXGk6W…](https://explorer.solana.com/tx/3FqXGk6W7c9ABVECqq1sKG2Ut9a3MDpqkcqDKh4Y33BeTnpn2DPdGKbcTvfmbh7466fhPsS15EHPskA8LLq1ou2J?cluster=devnet) |
| cancel | [GS864hKE…](https://explorer.solana.com/tx/GS864hKE3qpT3UxTi9PQD6mJ9rZGhAK6qv9eaefNxiMiTjXFJTU7kYSNjhDNJ4iTiSrRNfxCxF6yGwcAFE9HC2g?cluster=devnet) |

## Program

Anchor 1.2 (`programs/monthly`), 12 LiteSVM integration tests.

| Instruction | Signer | Effect |
|---|---|---|
| `create_plan(plan_id, name, image, amount, interval_seconds)` | creator | creates the `Plan` PDA `["plan", creator, plan_id]` |
| `update_plan(name, image, amount)` | creator | edits the listing; cuts apply to all, increases only to new or accepting members |
| `close_plan()` | creator | stops new subscriptions and charges |
| `subscribe()` | member | creates the `Subscription` PDA `["subscription", plan, member]` with the agreed price, collects period 1 |
| `charge()` | anyone | collects one period if due; pauses after the grace period if blocked |
| `accept_price()` | member | agrees to the plan's current, higher price |
| `resume()` | member | reactivates a paused subscription by collecting one period |
| `cancel()` | member | closes the subscription |

## Web app

Next.js 16 (App Router), shadcn/ui, wallet adapter (Wallet Standard), deployed on Vercel.

| Route | For | What |
|---|---|---|
| `/` | everyone | Product page |
| `/create` | creators | Guided setup: plan with live preview → connect Telegram → share link |
| `/dashboard`, `/dashboard/plans/[plan]`, `/dashboard/members` | creators | Overview, plan detail with Telegram connection, members with payment and group status |
| `/p/[plan]` | members | Checkout: connect wallet → approve and pay → join on Telegram |
| `/subscriptions` | members | Own subscriptions, price approvals, resume, cancel, spending limit |

| API | Purpose |
|---|---|
| `POST /api/auth/nonce`, `POST /api/auth/verify`, `GET /api/auth/session` | wallet sign-in |
| `POST /api/integrations/telegram/{connect,link}` | one-time bot links for creators and members |
| `GET /api/integrations/telegram/{status,members}` | connection state and per-member access state |
| `POST /api/integrations/telegram/webhook` | bot updates, authenticated by the webhook secret |
| `POST /api/access/refresh` | re-check access after cancel, resume or plan close |
| `POST /api/collect`, `POST /api/cron/charge` | collect due payments (on demand / scheduled) |
| `POST /api/faucet` | devnet test funds |
| `GET/POST /api/actions/subscribe/[plan]`, `/actions.json` | Solana Blink for plan links |
| `POST /api/upload` | plan image upload (Vercel Blob) |

## Development

Requirements: Rust, Solana CLI (Agave 4.x), Anchor 1.2, Node 22.

```sh
scripts/build.sh                      # anchor build for SBPF v0 (devnet and LiteSVM do not load v3 yet)
cd programs/monthly && cargo test     # program tests, no validator needed

cd app
npm install
cp .env.example .env.local            # fill in the values below
npm run dev
```

Environment variables (server side unless noted):

| Variable | Purpose |
|---|---|
| `FAUCET_KEYPAIR` | devnet wallet (JSON secret key): mint authority of the test USDC, pays fees for test funds and collection |
| `SESSION_SECRET` | HMAC key for sign-in sessions; also derives the scheduler token |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` | Telegram bot |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis (set automatically by the Vercel Marketplace integration) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for image uploads (set automatically when a Blob store is connected) |
| `NEXT_PUBLIC_RPC_URL` | optional, client and server; defaults to `https://api.devnet.solana.com` |

Telegram is inactive until the bot variables and Redis are present. After deploying, register the webhook once:

```sh
cd app && set -a && . ./.env.local && set +a
npx tsx scripts/telegram-webhook.ts https://monthly-sol.vercel.app
```

The scheduled job (`.github/workflows/charge.yml`) needs one repository secret, `CRON_TOKEN` = HMAC-SHA256 of `monthly-cron` with `SESSION_SECRET` (hex).

Scripts (`app/scripts`): `e2e.ts` runs a full plan → subscribe → charge → cancel cycle on devnet; `telegram-webhook.ts` registers the bot webhook; `create-test-mint.ts` created the test USDC mint.

## Repository layout

```
programs/monthly/src/          program: state, errors, instructions
programs/monthly/tests/        LiteSVM tests for every instruction, the price rule and failure paths
app/src/app/                   pages (site, create, dashboard) and API routes
app/src/components/            ui (shadcn/ui), plan, checkout, dashboard, wallet, marketing
app/src/hooks/                 data hooks per view, polling with retry, live clock, transactions
app/src/lib/chain/             program client: accounts, PDAs, instructions, pricing rules
app/src/integrations/          provider registry; Telegram Bot API client and bot logic
app/src/server/                store (Redis), wallet sign-in, payment collection, access sync
docs/INTEGRATIONS.md           design and security rules for community integrations
```
