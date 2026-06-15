use anchor_lang::prelude::*;

/// V2 — commitment reputation, non-transferable, wallet-bound.
/// Tracks historical commitment as a pure reputation metric.
#[account]
pub struct CommitmentRecord {
    pub wallet: Pubkey,
    pub total_xnfts_minted: u32,
    pub total_xnt_committed: u64,
    pub total_xnt_fulfilled: u64,  // principal from completed lock periods
    pub highest_class_ever: u8,
    pub total_commitment_days: u64,
    pub commitment_score: u32,     // weighted metric, display only — not redeemable
    pub last_updated: i64,
    pub bump: u8,
}

impl CommitmentRecord {
    pub const LEN: usize = 8
        + 32  // wallet
        + 4   // total_xnfts_minted
        + 8   // total_xnt_committed
        + 8   // total_xnt_fulfilled
        + 1   // highest_class_ever
        + 8   // total_commitment_days
        + 4   // commitment_score
        + 8   // last_updated
        + 1;  // bump
}
