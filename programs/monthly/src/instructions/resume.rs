use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::{
    constants::*,
    error::MonthlyError,
    instructions::collect::{check_mandate, pull},
    state::{Plan, Subscription, SubscriptionStatus},
};

#[derive(Accounts)]
pub struct Resume<'info> {
    pub subscriber: Signer<'info>,
    #[account(mut, constraint = plan.active @ MonthlyError::PlanClosed)]
    pub plan: Account<'info, Plan>,
    #[account(
        mut,
        has_one = plan,
        has_one = subscriber,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscriber.key().as_ref()],
        bump = subscription.bump,
    )]
    pub subscription: Account<'info, Subscription>,
    #[account(
        mut,
        address = subscription.subscriber_token_account @ MonthlyError::TokenAccountMismatch,
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = plan.merchant_token_account @ MonthlyError::TokenAccountMismatch,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,
    /// CHECK: program-derived delegate; only used as a signer for token transfers.
    #[account(seeds = [AUTHORITY_SEED], bump)]
    pub authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

/// Reactivates a paused subscription by collecting one period now.
pub fn handle_resume(ctx: Context<Resume>) -> Result<()> {
    require!(
        ctx.accounts.subscription.status == SubscriptionStatus::Paused,
        MonthlyError::NotPaused
    );
    let amount = ctx.accounts.subscription.agreed_amount.min(ctx.accounts.plan.amount);
    check_mandate(&ctx.accounts.subscriber_token_account, &ctx.accounts.authority.key(), amount)
        .map_err(MonthlyError::from)?;

    pull(
        &ctx.accounts.token_program,
        &ctx.accounts.subscriber_token_account,
        &ctx.accounts.merchant_token_account,
        &ctx.accounts.authority.to_account_info(),
        ctx.bumps.authority,
        amount,
    )?;

    let now = Clock::get()?.unix_timestamp;
    let plan = &mut ctx.accounts.plan;
    plan.total_collected += amount;

    let sub = &mut ctx.accounts.subscription;
    sub.status = SubscriptionStatus::Active;
    sub.periods_paid += 1;
    sub.next_charge_at = now + plan.interval_seconds;
    Ok(())
}
