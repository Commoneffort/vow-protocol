use anchor_lang::prelude::*;

#[account]
pub struct AppRegistry {
    pub program_id: Pubkey,
    pub verified: bool,
    pub blocked: bool,
    pub registered_at: i64,
    pub bump: u8,
}

impl AppRegistry {
    pub const LEN: usize = 8
        + 32  // program_id
        + 1   // verified
        + 1   // blocked
        + 8   // registered_at
        + 1;  // bump
}
