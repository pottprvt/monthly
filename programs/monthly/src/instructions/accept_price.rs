use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::MonthlyError,
    state::{Plan, Subscription},
};

#[derive(Accounts)]
pub struct AcceptPrice<'info> {
    pub subscriber: Signer<'info>,
    #[account(constraint = plan.active @ MonthlyError::PlanClosed)]
    pub plan: Account<'info, Plan>,
    #[account(
        mut,
        has_one = plan,
        has_one = subscriber,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscriber.key().as_ref()],
        bump = subscription.bump,
    )]
    pub subscription: Account<'info, Subscription>,
}

/// The subscriber agrees to the plan's current, higher price. Without this, they keep paying the old one.
pub fn handle_accept_price(ctx: Context<AcceptPrice>) -> Result<()> {
    let price = ctx.accounts.plan.amount;
    let sub = &mut ctx.accounts.subscription;
    require!(price > sub.agreed_amount, MonthlyError::NothingToAccept);
    sub.agreed_amount = price;
    Ok(())
}
