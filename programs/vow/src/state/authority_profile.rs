use anchor_lang::prelude::*;

#[account]
pub struct AuthorityProfile {
    pub wallet: Pubkey,
    pub profile_id: [u8; 8],
    pub default_daily_limit: u64,
    pub default_lifetime_limit: u64,
    pub default_expiry_days: u32,
    pub default_allowed_program_ids: [Pubkey; 8],
    pub program_count: u8,
    pub metadata_uri: [u8; 128],
    pub uri_len: u8,
    pub created_at: i64,
    pub bump: u8,
}

impl AuthorityProfile {
    pub const LEN: usize = 8
        + 32      // wallet
        + 8       // profile_id
        + 8       // default_daily_limit
        + 8       // default_lifetime_limit
        + 4       // default_expiry_days
        + 32 * 8  // default_allowed_program_ids
        + 1       // program_count
        + 128     // metadata_uri
        + 1       // uri_len
        + 8       // created_at
        + 1;      // bump
}
