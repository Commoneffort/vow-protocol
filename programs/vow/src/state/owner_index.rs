use anchor_lang::prelude::*;

/// One per wallet: `["owner_index", owner]`. Created by `mint_vow` (so a second mint
/// from the same wallet fails) or by `backfill_owner_index` for identities minted
/// before this account existed. `vow_state` is the wallet's canonical identity.
#[account]
pub struct OwnerIndex {
    pub owner: Pubkey,
    pub vow_state: Pubkey,
    pub bump: u8,
}

impl OwnerIndex {
    pub const LEN: usize = 8 + 32 + 32 + 1;
}
