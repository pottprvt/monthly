use anchor_lang::prelude::*;

use crate::{error::MonthlyError, instructions::create_plan::validate_listing, state::Plan};

#[derive(Accounts)]
pub struct UpdatePlan<'info> {
    pub merchant: Signer<'info>,
    #[account(mut, has_one = merchant, constraint = plan.active @ MonthlyError::PlanClosed)]
    pub plan: Account<'info, Plan>,
}

/// Changes name, image and price. A lower price reaches every subscriber at the next charge;
/// a higher price only applies to new subscribers and to those who call `accept_price`.
/// The interval cannot change: a shorter interval would be a hidden price increase.
pub fn handle_update_plan(ctx: Context<UpdatePlan>, name: String, image: String, amount: u64) -> Result<()> {
    validate_listing(&name, &image, amount)?;
    let plan = &mut ctx.accounts.plan;
    plan.name = name;
    plan.image = image;
    plan.amount = amount;
    Ok(())
}
