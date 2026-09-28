use anchor_lang::prelude::*;

use crate::{error::MonthlyError, state::Plan};

#[derive(Accounts)]
pub struct ClosePlan<'info> {
    pub merchant: Signer<'info>,
    #[account(mut, has_one = merchant, constraint = plan.active @ MonthlyError::PlanClosed)]
    pub plan: Account<'info, Plan>,
}

/// Stops all future charges and new subscriptions. Existing subscribers can still cancel.
pub fn handle_close_plan(ctx: Context<ClosePlan>) -> Result<()> {
    ctx.accounts.plan.active = false;
    Ok(())
}
