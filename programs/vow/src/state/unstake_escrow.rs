use anchor_lang::prelude::*;

#[account]
pub struct UnstakeEscrow {
    pub vow_state: Pubkey,
    pub owner: Pubkey,
    pub lamports_owed: u64,
    pub deactivation_epoch: u64,
    pub bump: u8,
}

impl UnstakeEscrow {
    pub const LEN: usize = 8
        + 32  // vow_state
        + 32  // owner
        + 8   // lamports_owed
        + 8   // deactivation_epoch
        + 1;  // bump
}
