//! Shared charge logic: verify the mandate and pull one period's amount.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{constants::AUTHORITY_SEED, error::MonthlyError};

/// Why a charge cannot be executed right now. None of these move funds.
pub enum CollectBlocker {
    MandateMissing,
    MandateExhausted,
    InsufficientFunds,
}

impl From<CollectBlocker> for MonthlyError {
    fn from(b: CollectBlocker) -> Self {
        match b {
            CollectBlocker::MandateMissing => MonthlyError::MandateMissing,
            CollectBlocker::MandateExhausted => MonthlyError::MandateExhausted,
            CollectBlocker::InsufficientFunds => MonthlyError::InsufficientFunds,
        }
    }
}

/// Checks the mandate without touching funds so callers can decide between erroring and pausing.
pub fn check_mandate(
    source: &Account<TokenAccount>,
    authority: &Pubkey,
    amount: u64,
) -> std::result::Result<(), CollectBlocker> {
    match source.delegate {
        anchor_lang::solana_program::program_option::COption::Some(d) if d == *authority => {}
        _ => return Err(CollectBlocker::MandateMissing),
    }
    if source.delegated_amount < amount {
        return Err(CollectBlocker::MandateExhausted);
    }
    if source.amount < amount {
        return Err(CollectBlocker::InsufficientFunds);
    }
    Ok(())
}

/// Moves `amount` from the subscriber's token account to the merchant's, signed by the program authority.
pub fn pull<'info>(
    token_program: &Program<'info, Token>,
    source: &Account<'info, TokenAccount>,
    destination: &Account<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    authority_bump: u8,
    amount: u64,
) -> Result<()> {
    let seeds: &[&[u8]] = &[AUTHORITY_SEED, &[authority_bump]];
    let signer_seeds = &[seeds];
    let cpi = CpiContext::new_with_signer(
        token_program.key(),
        Transfer {
            from: source.to_account_info(),
            to: destination.to_account_info(),
            authority: authority.clone(),
        },
        signer_seeds,
    );
    token::transfer(cpi, amount)
}
