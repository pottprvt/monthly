use anchor_lang::prelude::*;

#[error_code]
pub enum MonthlyError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Interval is shorter than the allowed minimum")]
    IntervalTooShort,
    #[msg("Plan name is too long")]
    NameTooLong,
    #[msg("Plan is closed")]
    PlanClosed,
    #[msg("Subscription is not active")]
    NotActive,
    #[msg("Subscription is not paused")]
    NotPaused,
    #[msg("Subscription is not due yet")]
    NotDue,
    #[msg("Subscriber has not approved the Monthly authority as delegate")]
    MandateMissing,
    #[msg("Delegated allowance is smaller than the plan amount")]
    MandateExhausted,
    #[msg("Subscriber token balance is smaller than the plan amount")]
    InsufficientFunds,
    #[msg("Charge failed and the grace period has not ended yet; retry later")]
    RetryLater,
    #[msg("Token account does not match the plan")]
    TokenAccountMismatch,
    #[msg("Image reference is too long")]
    ImageTooLong,
    #[msg("Plan price is not higher than the price you agreed to")]
    NothingToAccept,
}
