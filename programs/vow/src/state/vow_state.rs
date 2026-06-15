use anchor_lang::prelude::*;
use crate::constants::{LOCK_SECONDS, LAMPORTS_PER_XNT};
use crate::errors::VowError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum YieldMode {
    Compound,
    Hybrid,
    Treasury,
}

impl YieldMode {
    pub fn to_u8(self) -> u8 {
        match self {
            YieldMode::Compound => 0,
            YieldMode::Hybrid => 1,
            YieldMode::Treasury => 2,
        }
    }
}

/// Soulbound identity NFT. The owner field is immutable after mint.
/// The account persists permanently on-chain as a historical identity
/// credential regardless of stake state. Two lifecycle states:
///
///   Active Identity:  active_stake == true   (sessions allowed, yield spendable)
///   Dormant Identity: active_stake == false  (identity preserved, no new sessions)
///
/// Reputation fields (first_staked_at, total_commitments, total_fulfilled,
/// cumulative_stake_days, highest_class_ever) are append-only — never reset
/// by unstake or activate_stake.
#[account]
pub struct VowState {
    pub asset_id: Pubkey,
    pub owner: Pubkey,            // immutable — soulbound to creator wallet
    pub class: u8,                // 0–7, reflects current stake tier
    pub nonce: u64,               // sequential mint index; used for leaf hash

    pub principal_lamports: u64,  // most recent stake deposit; updated by activate_stake

    // Pool-share accounting
    pub shares: u128,
    pub last_share_price: u128,
    pub accrued_gain: i64,        // can be negative (slashing)

    pub yield_mode: YieldMode,
    pub yield_balance: u64,       // virtual claim against pool (accounting only)
    pub total_harvested: u64,

    pub created_at: i64,
    pub unlock_at: i64,
    pub matured: bool,

    /// Set by complete_unstake and activate_stake to expire existing sessions.
    pub sessions_invalidated_at: i64,

    /// Active Identity when true; Dormant Identity when false.
    /// Sessions cannot be created and yield cannot be spent when false.
    pub active_stake: bool,

    /// Monotonically increasing counter. Incremented by create_session.
    /// Stored in SessionAccount.creation_nonce so any device can re-derive the
    /// session keypair from: signMessage(program || vow || nonce).
    /// Ensures unique session keys even when an index slot is reused.
    pub session_nonce: u64,

    // ── Permanent Reputation Layer ──────────────────────────────────────────
    // These fields are append-only. Unstake and activate_stake never reset them.

    pub first_staked_at: i64,       // unix timestamp of original mint; immutable
    pub current_stake_started_at: i64, // updated by mint and activate_stake; used for cumulative_stake_days
    pub total_commitments: u32,     // incremented by mint and each activate_stake
    pub total_fulfilled: u32,       // incremented by complete_unstake when matured == true
    pub cumulative_stake_days: u64, // running total of days with active stake; updated at unstake
    pub highest_class_ever: u8,     // best class tier ever achieved; only ever increases

    pub bump: u8,
}

impl VowState {
    pub const LEN: usize = 8
        + 32  // asset_id
        + 32  // owner
        + 1   // class
        + 8   // nonce
        + 8   // principal_lamports
        + 16  // shares
        + 16  // last_share_price
        + 8   // accrued_gain (i64)
        + 1   // yield_mode
        + 8   // yield_balance
        + 8   // total_harvested
        + 8   // created_at
        + 8   // unlock_at
        + 1   // matured
        + 8   // sessions_invalidated_at
        + 1   // active_stake
        + 8   // session_nonce
        + 8   // first_staked_at
        + 8   // current_stake_started_at
        + 4   // total_commitments
        + 4   // total_fulfilled
        + 8   // cumulative_stake_days
        + 1   // highest_class_ever
        + 1;  // bump
}

pub fn class_for_stake(lamports: u64) -> Result<u8> {
    let xnt = lamports / LAMPORTS_PER_XNT;
    match xnt {
        1..=100        => Ok(0),
        101..=300      => Ok(1),
        301..=500      => Ok(2),
        501..=1_000    => Ok(3),
        1_001..=2_000  => Ok(4),
        2_001..=5_000  => Ok(5),
        5_001..=10_000 => Ok(6),
        10_001..       => Ok(7),
        _              => err!(VowError::InsufficientStake),
    }
}

pub fn lock_duration(class: u8) -> i64 {
    LOCK_SECONDS[class as usize]
}
