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

// Default scoring weights (admin-adjustable)
pub const DEFAULT_CREDITS_WEIGHT: u32 = 10;
pub const DEFAULT_SELF_STAKE_WEIGHT: u32 = 20;
pub const DEFAULT_SKIP_PENALTY: u32 = 5;
pub const DEFAULT_COMMISSION_PENALTY: u32 = 3;
pub const DEFAULT_SELF_STAKE_CEIL: u64 = 1_000_000 * LAMPORTS_PER_XNT; // 1M XNT
pub const UPTIME_EPOCH_THRESHOLD: u8 = 4; // must have credits in last 4 epochs

// Solana native stake account data size
pub const STAKE_ACCOUNT_SPACE: u64 = 200;
