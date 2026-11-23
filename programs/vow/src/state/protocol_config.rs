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
    // ── Price freshness + pool fees (occupies the 32 bytes formerly reserved as
    //    `merkle_tree`, which was always Pubkey::default() — so after upgrade these
    //    read as 0, i.e. "stale", until the first update_share_price). ──
    /// Pool `last_update_epoch` observed by the last update_share_price. Value-moving
    /// instructions require this to be >= the current epoch (see `require_fresh_price`).
    pub price_epoch: u64,
    /// Pool SOL deposit fee, parts-per-million (rounded up).
    pub deposit_fee_ppm: u32,
    /// Pool SOL withdrawal fee, parts-per-million (rounded up; max of current/scheduled).
    pub withdrawal_fee_ppm: u32,
    /// Set by update_share_price when liabilities exceed all assets by more than dust.
    /// Pauses fixed-claim payouts so the first claimants can't drain what remains.
    /// Cleared automatically by update_share_price once the protocol is solvent.
    pub insolvent: bool,
    pub _reserved: [u8; 15],

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
        + 8 + 4 + 4 + 1 + 15  // price_epoch, deposit_fee_ppm, withdrawal_fee_ppm, insolvent, _reserved
        + 8   // total_pending_unstake
        + 32  // spl_stake_pool
        + 32  // spl_pool_mint
        + 1   // reserve_bump
        + 1;  // bump
}
