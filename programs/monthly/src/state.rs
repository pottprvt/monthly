use anchor_lang::prelude::*;

use crate::constants::MAX_NAME_LEN;

#[account]
#[derive(InitSpace)]
pub struct Plan {
    pub merchant: Pubkey,
    pub mint: Pubkey,
    /// Token account that receives every charge. Fixed at creation.
    pub merchant_token_account: Pubkey,
    /// Amount per period, in the mint's base units.
    pub amount: u64,
    pub interval_seconds: i64,
    /// Merchant-chosen id, part of the PDA seed so one merchant can run several plans.
    pub plan_id: u64,
    pub active: bool,
    pub subscriber_count: u64,
    pub total_collected: u64,
    pub created_at: i64,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum SubscriptionStatus {
    Active,
    /// A charge failed after the grace period. The subscriber can resume once funds are back.
    Paused,
}

#[account]
#[derive(InitSpace)]
pub struct Subscription {
    pub subscriber: Pubkey,
    pub plan: Pubkey,
    /// Token account the charges are pulled from. Fixed at subscription.
    pub subscriber_token_account: Pubkey,
    pub next_charge_at: i64,
    pub status: SubscriptionStatus,
    pub periods_paid: u64,
    pub created_at: i64,
    pub bump: u8,
}
