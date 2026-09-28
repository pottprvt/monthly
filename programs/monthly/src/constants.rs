use anchor_lang::prelude::*;

/// Seed of the program-owned delegate that subscribers approve on their token account.
#[constant]
pub const AUTHORITY_SEED: &[u8] = b"authority";

#[constant]
pub const PLAN_SEED: &[u8] = b"plan";

#[constant]
pub const SUBSCRIPTION_SEED: &[u8] = b"subscription";

/// Time after the due date during which a failed charge is retried before the subscription is paused.
#[constant]
pub const GRACE_SECONDS: i64 = 3 * 24 * 60 * 60;

/// Shortest allowed billing interval. Short intervals exist so a judge can watch a charge happen live.
#[constant]
pub const MIN_INTERVAL_SECONDS: i64 = 60;

pub const MAX_NAME_LEN: usize = 32;
