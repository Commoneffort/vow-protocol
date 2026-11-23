pub const SHARE_PRECISION: u128 = 1_000_000_000_000; // 1e12

pub const SPL_STAKE_POOL_PROGRAM_ID: &str = "XPoo1Fx6KNgeAzFcq2dPTo95bWGUSj5KdPVqYj9CZux";
pub const LAMPORTS_PER_XNT: u64 = 1_000_000_000;   // 1e9
pub const EXPECTED_CREDITS_PER_EPOCH: u64 = 432_000;
pub const MAX_VALIDATORS: u8 = 50;
pub const MAX_PROGRAM_IDS: usize = 8;
pub const METADATA_URI_MAX_LEN: usize = 128;
pub const PROFILE_ID_LEN: usize = 8;

// Minimum stake for an xNFT (1 XNT)
pub const MIN_STAKE_LAMPORTS: u64 = LAMPORTS_PER_XNT;

// Lock durations per class in seconds
pub const LOCK_SECONDS: [i64; 8] = [
    30  * 86_400,   // Ruby
    90  * 86_400,   // Opal
    180 * 86_400,   // Topaz
    365 * 86_400,   // Emerald
    547 * 86_400,   // Aquamarine
    730 * 86_400,   // Sapphire
    1095 * 86_400,  // Amethyst
    1825 * 86_400,  // Xenturion
];

pub const CLASS_NAMES: [&str; 8] = [
    "Ruby", "Opal", "Topaz", "Emerald", "Aquamarine", "Sapphire", "Amethyst", "Xenturion",
];

/// Seed for the PDA a dApp program signs with (via invoke_signed) when it CPIs into
/// yield_spend for a whitelisted session: find_program_address(&[VOW_CALLER_SEED], app_program_id).
pub const VOW_CALLER_SEED: &[u8] = b"vow_caller";

/// X1's associated token program (differs from the standard Solana ATA program).
pub const X1_ATA_PROGRAM_ID: &str = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

/// Fee math denominator (parts-per-million).
pub const PPM: u128 = 1_000_000;
