use anchor_lang::prelude::*;

/// A session key authorization account. The PDA is derived from
/// [b"session", vow_state, session_index_le4].
///
/// session_index is user-chosen (0, 1, 2, …) and is a stable human-meaningful slot.
/// creation_nonce is copied from VowState.session_nonce at the moment of creation,
/// making each session's keypair derivation unique even if the same index is reused.
///
/// Recoverable Session derivation (client-side, Version 2):
///   msg = "VOW Session Authorization\nDomain: <origin>\nProgram: <PROGRAM_ID>\nIdentity: <vow_state>\nNonce: <creation_nonce>\nVersion: 2"
///   sig = wallet.signMessage(msg)   // 64-byte Ed25519 signature
///   seed = SHA-256(sig)             // hash full sig to eliminate seed bias
///   → Keypair.fromSeed(seed)
#[account]
pub struct SessionAccount {
    pub vow_state: Pubkey,
    pub session_key: Pubkey,
    pub allowed_program_ids: [Pubkey; 8],
    pub program_count: u8,

    /// Stable slot index chosen by the user. PDA seed.
    pub session_index: u32,

    /// VowState.session_nonce at time of creation. Used for Recoverable Session
    /// key derivation — ensures unique keys even when an index slot is reused.
    pub creation_nonce: u64,

    pub start_ts: i64,
    pub expiry_ts: i64,

    pub daily_limit: u64,
    pub lifetime_limit: u64,
    pub velocity_limit: u32,

    // Spending trackers (reset daily)
    pub spent_today: u64,
    pub spent_total: u64,
    pub tx_count_today: u32,
    pub last_reset_day: i64,

    pub active: bool,
    pub bump: u8,
}

impl SessionAccount {
    pub const LEN: usize = 8
        + 32              // vow_state
        + 32              // session_key
        + 32 * 8          // allowed_program_ids
        + 1               // program_count
        + 4               // session_index
        + 8               // creation_nonce
        + 8               // start_ts
        + 8               // expiry_ts
        + 8               // daily_limit
        + 8               // lifetime_limit
        + 4               // velocity_limit
        + 8               // spent_today
        + 8               // spent_total
        + 4               // tx_count_today
        + 8               // last_reset_day
        + 1               // active
        + 1;              // bump

    pub fn reset_daily_if_needed(&mut self, unix_ts: i64) {
        let current_day = unix_ts / 86_400;
        if current_day > self.last_reset_day {
            self.spent_today = 0;
            self.tx_count_today = 0;
            self.last_reset_day = current_day;
        }
    }
}
