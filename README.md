# Monthly — recurring payments on Solana

Solana has no direct debit. Every subscription today is either a credit card (Stripe, 3 % fee, no wallet users) or a merchant chasing people by hand each month. Monthly fixes that with the token program's own delegate feature: the subscriber approves a program-owned authority once (the mandate), and from then on the program pulls the plan amount when it is due. Nothing is prepaid, nothing sits in a vault, the money stays in the subscriber's wallet until the day it is due.

Built for the Superteam Germany "Road to Colosseum: Build your MVP" bounty and the Colosseum Crypto World's Fair hackathon (September–October 2026).

## How it works

1. **Merchant creates a plan**: name, amount, interval. The plan stores the merchant's token account, so charges can only ever land there.
2. **Subscriber subscribes**: one transaction that (a) approves the Monthly authority as delegate on the subscriber's USDC account for a chosen allowance, e.g. twelve periods, and (b) creates the subscription and collects the first period.
3. **Charges**: once the interval has passed, anyone may call `charge`. The program checks the mandate and the balance and moves exactly the plan amount to the merchant. A charge that cannot be covered is retried during a three-day grace period, then the subscription is paused.
4. **Subscriber stays in control**: cancel at any time (account closed, rent returned), revoke the delegate in any wallet, resume a paused subscription once funds are back.
5. **Merchant edits a plan**: name, image and price can change; the billing interval cannot.
6. **Merchant closes a plan**: no new subscriptions, no further charges.

### Price rule

Every subscription stores the price the subscriber signed for. A charge always takes the lower of that agreed price and the plan's current price:

- **Price cut**: applies to every subscriber at the next charge, automatically.
- **Price increase**: applies to new subscribers only. Existing subscribers keep paying their agreed price until they sign `accept_price`.

A merchant therefore cannot raise what an existing subscriber pays, and the interval is immutable because a shorter interval would be a hidden increase.

What the program guarantees regardless of any website:

- Only min(agreed price, current price), only when due, only to the plan's merchant account.
- No price increase without the subscriber's signature.
- Only the subscriber can cancel or resume; only the merchant can close a plan.
- The allowance is a hard ceiling set by the subscriber and decreases with every charge.

## Try it

Live app (devnet): **https://monthly-sol.vercel.app**

1. Switch Phantom, Solflare or Backpack to devnet and connect.
2. Click **Get test funds**: 100 test USDC, plus 0.05 devnet SOL for fees if the wallet is empty. No external faucet needed.
3. Subscribe to the [demo plan](https://monthly-sol.vercel.app/p/2SkdzDedm7py8Y9PvBGwJ9ec3cEyuiXbc2vpubihbeQQ) (1 test USDC every minute), or create your own plan under **Merchant** and subscribe with a second wallet.
4. Watch the charges arrive under **Merchant** or **My subscriptions**; cancel or revoke the mandate any time.

## Devnet addresses

| What | Address |
|---|---|
| Program | [`6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ`](https://explorer.solana.com/address/6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ?cluster=devnet) |
| Mandate authority (PDA `["authority"]`) | derived, see `app/src/lib/monthly.ts` |
| Test USDC mint (6 decimals) | [`FbLav7StPpMyLdSBDhrsDNJQ3XbimxW5isbUY5CtWVFw`](https://explorer.solana.com/address/FbLav7StPpMyLdSBDhrsDNJQ3XbimxW5isbUY5CtWVFw?cluster=devnet) |
| Demo plan | [`2SkdzDedm7py8Y9PvBGwJ9ec3cEyuiXbc2vpubihbeQQ`](https://explorer.solana.com/address/2SkdzDedm7py8Y9PvBGwJ9ec3cEyuiXbc2vpubihbeQQ?cluster=devnet) |

Example transactions from the end-to-end run (`app/scripts/e2e.ts`):

| Step | Transaction |
|---|---|
| create plan | [3ZF3196m…](https://explorer.solana.com/tx/3ZF3196mgPX3MLMkGvCZgQnt8rWB3gP3AcsKcUvCZDXYkkAPcPwij9UVx33YSDoBQFGErhW96uzxcVfsAnrUJhpB?cluster=devnet) |
| approve mandate + subscribe | [54D19pnC…](https://explorer.solana.com/tx/54D19pnCY6VWM8Q663L5w64yT5wxNVCqLH5Wx7Cn9wLuzMQmdAx3BFR7SDVXDLTdAwUQumQM6mPLMXqNCpfmX9Ld?cluster=devnet) |
| charge when due | [3FqXGk6W…](https://explorer.solana.com/tx/3FqXGk6W7c9ABVECqq1sKG2Ut9a3MDpqkcqDKh4Y33BeTnpn2DPdGKbcTvfmbh7466fhPsS15EHPskA8LLq1ou2J?cluster=devnet) |
| cancel | [GS864hKE…](https://explorer.solana.com/tx/GS864hKE3qpT3UxTi9PQD6mJ9rZGhAK6qv9eaefNxiMiTjXFJTU7kYSNjhDNJ4iTiSrRNfxCxF6yGwcAFE9HC2g?cluster=devnet) |

## Program

Anchor 1.2, deployed on Devnet: `6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ`

| Instruction | Signer | Effect |
|---|---|---|
| `create_plan(plan_id, name, image, amount, interval_seconds)` | merchant | creates the `Plan` PDA `["plan", merchant, plan_id]` |
| `update_plan(name, image, amount)` | merchant | edits the listing; cuts apply to all, increases only to new or accepting subscribers |
| `accept_price()` | subscriber | agrees to the plan's current, higher price |
| `subscribe()` | subscriber | creates `Subscription` PDA `["subscription", plan, subscriber]` with the agreed price, collects period 1 |
| `charge()` | anyone | collects one period if `now >= next_charge_at`; pauses after grace if blocked |
| `resume()` | subscriber | reactivates a paused subscription by collecting one period |
| `cancel()` | subscriber | closes the subscription |
| `close_plan()` | merchant | deactivates the plan |

The delegate authority is the PDA `["authority"]`. Subscribers approve it with a normal SPL `approve`; the client builds that instruction into the subscribe transaction.

## Blink

Plan links work as Solana Actions. `GET /api/actions/subscribe/<plan>` returns the card, `POST` returns the approve + subscribe transaction; `/actions.json` maps `/p/*` to it, so a plan link shared on X renders as a subscribe button in Blink-capable clients.

## Development

Requirements: Rust, Solana CLI (Agave 4.x), Anchor 1.2, Node 22.

```sh
scripts/build.sh                      # anchor build with SBPF v0 (see script for why)
cd programs/monthly && cargo test     # LiteSVM integration tests, no validator needed
```

Deploy to devnet:

```sh
solana program deploy target/deploy/monthly.so --program-id target/deploy/monthly-keypair.json --url devnet
```

Web app:

```sh
cd app
npm install
cp .env.example .env.local            # set FAUCET_KEYPAIR for the test-funds button
npm run dev
```

Environment variables:

| Variable | Where | Purpose |
|---|---|---|
| `FAUCET_KEYPAIR` | server (Vercel), GitHub secret | devnet wallet that is mint authority of the test USDC and pays fees for the test-funds button and the charge job |
| `NEXT_PUBLIC_RPC_URL` | optional | devnet RPC, defaults to `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_USDC_MINT` | optional | token mint, defaults to the test USDC above |

Scripts (`app/scripts`):

- `charge.ts`: collects every due subscription; run by a GitHub Action every 10 minutes.
- `e2e.ts`: end-to-end run against devnet with fresh wallets.
- `create-test-mint.ts`: one-off creation of the test USDC mint.

## Web app

| Route | For | What |
|---|---|---|
| `/` | everyone | Product page |
| `/create` | creators | Guided setup: plan (with live preview) → community → share link |
| `/dashboard` | creators | Overview, setup checklist, payments due, recent members |
| `/dashboard/plans`, `/dashboard/plans/[plan]` | creators | Plans, checkout link, community connections, members, edit/close |
| `/dashboard/members` | creators | All members with status filter |
| `/p/[plan]` | members | Checkout in three steps: connect wallet → approve and pay → join community |
| `/subscriptions` | members | Own subscriptions, price approvals, resume, cancel, spending limit |

Community access (Telegram, Discord) is prepared as a provider registry (`app/src/integrations`, `GET /api/integrations`); the bot flows and security rules are specified in [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

## Repository layout

```
programs/monthly/src/          program: state.rs, error.rs, instructions/*
programs/monthly/tests/        LiteSVM tests covering every instruction, the price rule and failure paths
app/src/app/                   routes (site, create, dashboard) and API routes (Blink, test funds, upload, integrations)
app/src/components/            ui (shadcn/ui), plan, checkout, dashboard, wallet, marketing
app/src/hooks/                 data hooks per view, polling with retry, transactions with toasts
app/src/lib/chain/             program client: accounts, PDAs, instructions, pricing rules
app/src/integrations/          community provider registry (Telegram, Discord)
app/scripts/                   charge job, devnet e2e run, test mint setup
docs/INTEGRATIONS.md           architecture for the Telegram and Discord bots
scripts/build.sh               build helper
```
