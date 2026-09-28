use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::{
    constants::*,
    error::MonthlyError,
    instructions::collect::{check_mandate, pull},
    state::{Plan, Subscription, SubscriptionStatus},
};

#[derive(Accounts)]
pub struct Charge<'info> {
    /// Anyone may trigger a due charge; they only pay the transaction fee.
    pub payer: Signer<'info>,
    #[account(mut, constraint = plan.active @ MonthlyError::PlanClosed)]
    pub plan: Account<'info, Plan>,
    #[account(
        mut,
        has_one = plan,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscription.subscriber.as_ref()],
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

/// Collects one period if due. Inside the grace period a blocked charge errors so the caller retries;
/// after the grace period it pauses the subscription instead.
pub fn handle_charge(ctx: Context<Charge>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let sub = &ctx.accounts.subscription;
    require!(sub.status == SubscriptionStatus::Active, MonthlyError::NotActive);
    require!(now >= sub.next_charge_at, MonthlyError::NotDue);

    let amount = ctx.accounts.plan.amount;
    if let Err(blocker) = check_mandate(
        &ctx.accounts.subscriber_token_account,
        &ctx.accounts.authority.key(),
        amount,
    ) {
        if now > sub.next_charge_at + GRACE_SECONDS {
            ctx.accounts.subscription.status = SubscriptionStatus::Paused;
            msg!("charge blocked after grace period, subscription paused");
            return Ok(());
        }
        let _ = MonthlyError::from(blocker);
        return err!(MonthlyError::RetryLater);
    }

    pull(
        &ctx.accounts.token_program,
        &ctx.accounts.subscriber_token_account,
        &ctx.accounts.merchant_token_account,
        &ctx.accounts.authority.to_account_info(),
        ctx.bumps.authority,
        amount,
    )?;

    let plan = &mut ctx.accounts.plan;
    plan.total_collected += amount;

    let sub = &mut ctx.accounts.subscription;
    sub.periods_paid += 1;
    // Keep the original schedule; only if periods were missed entirely, restart from now.
    let mut next = sub.next_charge_at + plan.interval_seconds;
    if next <= now {
        next = now + plan.interval_seconds;
    }
    sub.next_charge_at = next;
    Ok(())
}
