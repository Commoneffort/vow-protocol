use anchor_lang::prelude::*;

/// Idempotency guard for commitment record instructions.
/// One PDA per (CommitmentRecord, VowState) pair — prevents re-recording the
/// same identity more than once.
#[account]
pub struct CrGate {
    pub bump: u8,
}

impl CrGate {
    pub const LEN: usize = 8 + 1; // discriminator + bump
}
