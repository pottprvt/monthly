# Monthly — recurring payments on Solana

Solana has no direct debit. Every subscription today is either a credit card (Stripe, 3 % fee, no wallet users) or a merchant chasing people by hand each month. Monthly fixes that with the token program's own delegate feature: the subscriber approves a program-owned authority once (the mandate), and from then on the program pulls the plan amount when it is due. Nothing is prepaid, nothing sits in a vault, the money stays in the subscriber's wallet until the day it is due.

Built for the Superteam Germany "Road to Colosseum: Build your MVP" bounty and the Colosseum Crypto World's Fair hackathon (September–October 2026).

## How it works

1. **Merchant creates a plan**: name, amount, interval. The plan stores the merchant's token account, so charges can only ever land there.
2. **Subscriber subscribes**: one transaction that (a) approves the Monthly authority as delegate on the subscriber's USDC account for a chosen allowance, e.g. twelve periods, and (b) creates the subscription and collects the first period.
3. **Charges**: once the interval has passed, anyone may call `charge`. The program checks the mandate and the balance and moves exactly the plan amount to the merchant. A charge that cannot be covered is retried during a three-day grace period, then the subscription is paused.
4. **Subscriber stays in control**: cancel at any time (account closed, rent returned), revoke the delegate in any wallet, resume a paused subscription once funds are back.
5. **Merchant closes a plan**: no new subscriptions, no further charges.

What the program guarantees regardless of any website:

- Only the plan amount, only when due, only to the plan's merchant account.
- Only the subscriber can cancel or resume; only the merchant can close a plan.
- The allowance is a hard ceiling set by the subscriber and decreases with every charge.

## Program

Anchor 1.2, deployed on Devnet: `6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ`

| Instruction | Signer | Effect |
|---|---|---|
| `create_plan(plan_id, name, amount, interval_seconds)` | merchant | creates the `Plan` PDA `["plan", merchant, plan_id]` |
| `subscribe()` | subscriber | creates `Subscription` PDA `["subscription", plan, subscriber]`, collects period 1 |
| `charge()` | anyone | collects one period if `now >= next_charge_at`; pauses after grace if blocked |
| `resume()` | subscriber | reactivates a paused subscription by collecting one period |
| `cancel()` | subscriber | closes the subscription |
| `close_plan()` | merchant | deactivates the plan |

The delegate authority is the PDA `["authority"]`. Subscribers approve it with a normal SPL `approve`; the client builds that instruction into the subscribe transaction.

## Development

Requirements: Rust, Solana CLI (Agave 4.x), Anchor 1.2.

```sh
scripts/build.sh          # anchor build with SBPF v0 (see script for why)
cd programs/monthly && cargo test   # LiteSVM integration tests, no validator needed
```

Deploy to devnet:

```sh
solana config set --url devnet
anchor deploy
```

## Repository layout

```
programs/monthly/src/          program: state.rs, error.rs, instructions/*
programs/monthly/tests/        LiteSVM tests covering every instruction and failure path
app/                           Next.js web app (coming)
scripts/                       build helper, charge job (coming)
```
