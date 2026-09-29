use anchor_lang::prelude::*;

use crate::{error::MonthlyError, state::Plan};

#[derive(Accounts)]
pub struct DeletePlan<'info> {
    #[account(mut)]
    pub merchant: Signer<'info>,
    #[account(
        mut,
        close = merchant,
        has_one = merchant,
        constraint = plan.subscriber_count == 0 @ MonthlyError::PlanHasMembers,
    )]
    pub plan: Account<'info, Plan>,
}

/// Removes a plan without members and returns its storage deposit to the merchant.
/// Plans with members must wait until every subscription is cancelled, because
/// subscriptions reference the plan account.
pub fn handle_delete_plan(_ctx: Context<DeletePlan>) -> Result<()> {
    Ok(())
}
