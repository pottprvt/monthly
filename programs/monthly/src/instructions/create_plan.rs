use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

use crate::{constants::*, error::MonthlyError, state::Plan};

#[derive(Accounts)]
#[instruction(plan_id: u64)]
pub struct CreatePlan<'info> {
    #[account(mut)]
    pub merchant: Signer<'info>,
    #[account(
        init,
        payer = merchant,
        space = 8 + Plan::INIT_SPACE,
        seeds = [PLAN_SEED, merchant.key().as_ref(), &plan_id.to_le_bytes()],
        bump
    )]
    pub plan: Account<'info, Plan>,
    pub mint: Account<'info, Mint>,
    #[account(
        constraint = merchant_token_account.owner == merchant.key() @ MonthlyError::TokenAccountMismatch,
        constraint = merchant_token_account.mint == mint.key() @ MonthlyError::TokenAccountMismatch,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

pub fn validate_listing(name: &str, image: &str, amount: u64) -> Result<()> {
    require!(amount > 0, MonthlyError::ZeroAmount);
    require!(name.len() <= MAX_NAME_LEN, MonthlyError::NameTooLong);
    require!(image.len() <= MAX_IMAGE_LEN, MonthlyError::ImageTooLong);
    Ok(())
}

pub fn handle_create_plan(
    ctx: Context<CreatePlan>,
    plan_id: u64,
    name: String,
    image: String,
    amount: u64,
    interval_seconds: i64,
) -> Result<()> {
    validate_listing(&name, &image, amount)?;
    require!(interval_seconds >= MIN_INTERVAL_SECONDS, MonthlyError::IntervalTooShort);

    let plan = &mut ctx.accounts.plan;
    plan.merchant = ctx.accounts.merchant.key();
    plan.mint = ctx.accounts.mint.key();
    plan.merchant_token_account = ctx.accounts.merchant_token_account.key();
    plan.amount = amount;
    plan.interval_seconds = interval_seconds;
    plan.plan_id = plan_id;
    plan.active = true;
    plan.subscriber_count = 0;
    plan.total_collected = 0;
    plan.created_at = Clock::get()?.unix_timestamp;
    plan.name = name;
    plan.image = image;
    plan.bump = ctx.bumps.plan;
    Ok(())
}
