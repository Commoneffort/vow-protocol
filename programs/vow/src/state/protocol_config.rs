use anchor_lang::prelude::*;

#[account]
pub struct ProtocolConfig {
    pub admin: Pubkey,

    // Share accounting
    pub current_share_price: u128, // scaled by SHARE_PRECISION (1e12)
    pub total_shares: u128,
    pub total_yield_claims: u64,   // sum of all yield_balance across all VOWs
    pub last_pool_lamports: u64,   // cached totalLamports from SPL pool at last update

    // Mint counter — nonce for asset_id PDA derivation
    pub total_minted: u64,
    pub merkle_tree: Pubkey, // reserved for future spl-account-compression upgrade

    // Running total of all active unstake escrow lamports_owed — used for pro-rata payout
    pub total_pending_unstake: u64,

    // X1 Foundation SPL stake pool integration
    pub spl_stake_pool: Pubkey, // X1SPaMUM1A8E1vKL8XQAB5rxKarJbqtWFFSNFs8f7Av (mainnet)
    pub spl_pool_mint: Pubkey,  // pXNTyoqQsskHdZ7Q1rnP25FEyHHjissbs7n6RRN2nP5 (mainnet)

    // Reserve PDA bump (moved here from StakePool)
    pub reserve_bump: u8,

    pub bump: u8,
}

impl ProtocolConfig {
    pub const LEN: usize = 8
        + 32  // admin
        + 16  // current_share_price
        + 16  // total_shares
        + 8   // total_yield_claims
        + 8   // last_pool_lamports
        + 8   // total_minted
        + 32  // merkle_tree
        + 8   // total_pending_unstake
        + 32  // spl_stake_pool
        + 32  // spl_pool_mint
        + 1   // reserve_bump
        + 1;  // bump
}
