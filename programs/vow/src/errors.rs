use anchor_lang::prelude::*;

#[error_code]
pub enum VowError {
    #[msg("Insufficient stake amount for any class")]
    InsufficientStake,
    #[msg("Stake amount exceeds maximum")]
    StakeOverflow,
    #[msg("Vow identity has not yet matured")]
    NotMatured,
    #[msg("Vow identity is already matured")]
    AlreadyMatured,
    #[msg("Vow identity is already in unstake state")]
    AlreadyUnstaking,
    #[msg("Vow identity is not in unstake state")]
    NotUnstaking,
    #[msg("Invalid asset ID for this nonce")]
    InvalidAssetId,
    #[msg("Invalid owner — Vow identity owner mismatch")]
    InvalidOwner,
    #[msg("Session is expired")]
    SessionExpired,
    #[msg("Session is not active")]
    SessionInactive,
    #[msg("Session was invalidated — identity unstaked or re-activated")]
    SessionInvalidated,
    #[msg("Calling program is not in session's allowed_program_ids")]
    ProgramNotAllowed,
    #[msg("Daily spend limit exceeded")]
    DailyLimitExceeded,
    #[msg("Lifetime spend limit exceeded")]
    LifetimeLimitExceeded,
    #[msg("Transaction velocity limit exceeded")]
    VelocityLimitExceeded,
    #[msg("Insufficient yield balance")]
    InsufficientYieldBalance,
    #[msg("Application is blocked")]
    AppBlocked,
    #[msg("Share price computation overflow")]
    SharePriceOverflow,
    #[msg("Shares underflow — insufficient shares to burn")]
    SharesUnderflow,
    #[msg("No rewards available to harvest")]
    NoRewards,
    #[msg("Yield mode is unchanged")]
    YieldModeUnchanged,
    #[msg("Authority profile not found")]
    ProfileNotFound,
    #[msg("Authority profile ID already in use")]
    ProfileIdTaken,
    #[msg("Maximum allowed program IDs per session exceeded")]
    TooManyProgramIds,
    #[msg("Invalid stake account data")]
    InvalidStakeAccount,
    #[msg("Unauthorized — admin only")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Stake deactivation not yet complete — wait one epoch after begin_unstake")]
    StakeNotDeactivated,
    #[msg("Reserve is empty")]
    EmptyReserve,
    #[msg("Merkle tree capacity exhausted")]
    TreeCapacityExhausted,
    #[msg("Pool stake account does not match the validator entry's registered stake account")]
    StakeAccountMismatch,
    #[msg("Vow identity has no active stake — call recommit to re-activate")]
    IdentityInactive,
    #[msg("Vow identity already has an active stake position — unstake first")]
    IdentityAlreadyActive,
    #[msg("App registry account does not match calling program")]
    AppRegistryMismatch,
    #[msg("Reserve has sufficient SOL — withdraw_from_pool only callable when reserve cannot cover the pending unstake")]
    ReserveSufficient,
    #[msg("Share price not yet synced from pool — call update_share_price before minting")]
    SharePriceNotSynced,
}
