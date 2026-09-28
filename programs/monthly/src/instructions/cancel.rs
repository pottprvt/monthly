use anchor_lang::prelude::*;

use crate::{
    constants::*,
    state::{Plan, Subscription},
};

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,
    #[account(mut)]
    pub plan: Account<'info, Plan>,
    #[account(
        mut,
        close = subscriber,
        has_one = plan,
        has_one = subscriber,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscriber.key().as_ref()],
        bump = subscription.bump,
    )]
    pub subscription: Account<'info, Subscription>,
}

/// Ends the subscription. The account is closed and its rent returned to the subscriber.
/// Revoking the token delegate is left to the client, because one delegate may serve several plans.
pub fn handle_cancel(ctx: Context<Cancel>) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    plan.subscriber_count = plan.subscriber_count.saturating_sub(1);
    Ok(())
}
