use anchor_lang::prelude::*;

#[event]
pub struct ProtocolInitialized {
    pub admin: Pubkey,
    pub merkle_tree: Pubkey,
}

#[event]
pub struct VowMinted {
    pub asset_id: Pubkey,
    pub owner: Pubkey,
    pub class: u8,
    pub stake_lamports: u64,
    pub shares: u128,
    pub unlock_at: i64,
}

#[event]
pub struct VowMatured {
    pub asset_id: Pubkey,
    pub owner: Pubkey,
    pub class: u8,
}

#[event]
pub struct VowUnstakeBegun {
    pub asset_id: Pubkey,
    pub owner: Pubkey,
    pub lamports_owed: u64,
}

#[event]
pub struct VowUnstaked {
    pub asset_id: Pubkey,
    pub owner: Pubkey,
    pub lamports_returned: u64,
}

#[event]
pub struct VowStakeActivated {
    pub asset_id: Pubkey,
    pub owner: Pubkey,
    pub new_class: u8,
    pub stake_lamports: u64,
    pub shares: u128,
    pub unlock_at: i64,
}

#[event]
pub struct Harvested {
    pub asset_id: Pubkey,
    pub owner: Pubkey,
    pub gain: i64,
    pub yield_credited: u64,
    pub shares_burned: u128,
}

#[event]
pub struct YieldWithdrawn {
    pub asset_id: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct YieldDeposited {
    pub asset_id: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct YieldSpent {
    pub asset_id: Pubkey,
    pub session_key: Pubkey,
    pub program_id: Pubkey,
    pub amount: u64,
    pub destination: Pubkey,
}

#[event]
pub struct SessionCreated {
    pub vow_state: Pubkey,
    pub session_key: Pubkey,
    pub expiry_ts: i64,
    pub creation_nonce: u64,
}

#[event]
pub struct SessionRevoked {
    pub vow_state: Pubkey,
    pub session_key: Pubkey,
}

#[event]
pub struct SharePriceUpdated {
    pub old_price: u128,
    pub new_price: u128,
    pub pool_lamports: u64,
    pub total_shares: u128,
}

#[event]
pub struct AppRegistered {
    pub program_id: Pubkey,
}

#[event]
pub struct AppBlocked {
    pub program_id: Pubkey,
}

#[event]
pub struct YieldModeUpdated {
    pub asset_id: Pubkey,
    pub old_mode: u8,
    pub new_mode: u8,
}

#[event]
pub struct StakeAdded {
    pub asset_id: Pubkey,
    pub owner: Pubkey,
    pub lamports_added: u64,
    pub new_principal: u64,
    pub old_class: u8,
    pub new_class: u8,
    pub new_unlock_at: i64,
}
