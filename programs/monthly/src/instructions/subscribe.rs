use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::{
    constants::*,
    error::MonthlyError,
    instructions::collect::{check_mandate, pull},
    state::{Plan, Subscription, SubscriptionStatus},
};

#[derive(Accounts)]
pub struct Subscribe<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,
    #[account(mut, constraint = plan.active @ MonthlyError::PlanClosed)]
    pub plan: Account<'info, Plan>,
    #[account(
        init,
        payer = subscriber,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscriber.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    #[account(
        mut,
        constraint = subscriber_token_account.owner == subscriber.key() @ MonthlyError::TokenAccountMismatch,
        constraint = subscriber_token_account.mint == plan.mint @ MonthlyError::TokenAccountMismatch,
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
    pub system_program: Program<'info, System>,
}

/// Creates the subscription and collects the first period immediately.
/// The subscriber must have approved the program authority as delegate beforehand
/// (normally in the same transaction). `expected_amount` is the price the subscriber saw; if the
/// merchant changed the price in the meantime, the subscription is refused.
pub fn handle_subscribe(ctx: Context<Subscribe>, expected_amount: u64) -> Result<()> {
    let amount = ctx.accounts.plan.amount;
    require!(amount == expected_amount, MonthlyError::PriceChanged);
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
    plan.subscriber_count += 1;
    plan.total_collected += amount;

    let sub = &mut ctx.accounts.subscription;
    sub.subscriber = ctx.accounts.subscriber.key();
    sub.plan = plan.key();
    sub.subscriber_token_account = ctx.accounts.subscriber_token_account.key();
    sub.agreed_amount = amount;
    sub.next_charge_at = now + plan.interval_seconds;
    sub.status = SubscriptionStatus::Active;
    sub.periods_paid = 1;
    sub.created_at = now;
    sub.bump = ctx.bumps.subscription;
    Ok(())
}
