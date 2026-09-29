//! Monthly: recurring payments on Solana.
//!
//! A merchant creates a plan. A subscriber approves the program's authority as delegate on their
//! token account (the mandate) and subscribes. From then on anyone can trigger `charge` once a
//! period is due; the program only ever moves the plan amount, only to the plan's merchant account.
//! Price rule: a subscriber is charged min(agreed price, current plan price), so price cuts apply
//! immediately and price increases need the subscriber's signature (`accept_price`).

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ");

#[program]
pub mod monthly {
    use super::*;

    pub fn create_plan(
        ctx: Context<CreatePlan>,
        plan_id: u64,
        name: String,
        image: String,
        amount: u64,
        interval_seconds: i64,
    ) -> Result<()> {
        instructions::create_plan::handle_create_plan(ctx, plan_id, name, image, amount, interval_seconds)
    }

    pub fn update_plan(ctx: Context<UpdatePlan>, name: String, image: String, amount: u64) -> Result<()> {
        instructions::update_plan::handle_update_plan(ctx, name, image, amount)
    }

    pub fn accept_price(ctx: Context<AcceptPrice>) -> Result<()> {
        instructions::accept_price::handle_accept_price(ctx)
    }

    pub fn subscribe(ctx: Context<Subscribe>) -> Result<()> {
        instructions::subscribe::handle_subscribe(ctx)
    }

    pub fn charge(ctx: Context<Charge>) -> Result<()> {
        instructions::charge::handle_charge(ctx)
    }

    pub fn resume(ctx: Context<Resume>) -> Result<()> {
        instructions::resume::handle_resume(ctx)
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel::handle_cancel(ctx)
    }

    pub fn close_plan(ctx: Context<ClosePlan>) -> Result<()> {
        instructions::close_plan::handle_close_plan(ctx)
    }
}
