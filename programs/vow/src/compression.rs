/// xNFT leaf-hash utilities.
/// Phase 1: PDA-based storage with keccak leaf schema.
/// Compatible for future migration to spl-account-compression once
/// the platform-tools toolchain supports Rust edition 2024 (≥ 1.85).

use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;

pub const LEAF_PREFIX: &[u8] = b"idnft-leaf-v1";

/// Derive the asset_id PDA for a given tree counter (nonce) value.
pub fn get_asset_id_pda(nonce: u64, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"vow_asset", &nonce.to_le_bytes()],
        program_id,
    )
}

/// Hash immutable xNFT metadata (class, principal, created_at) → data_hash.
pub fn data_hash(class: u8, principal_lamports: u64, created_at: i64) -> [u8; 32] {
    let mut buf = [0u8; 17];
    buf[0] = class;
    buf[1..9].copy_from_slice(&principal_lamports.to_le_bytes());
    buf[9..17].copy_from_slice(&created_at.to_le_bytes());
    keccak::hash(&buf).0
}

/// Compute the canonical leaf hash for an xNFT (used for off-chain indexing).
pub fn leaf_hash(
    asset_id: &Pubkey,
    owner: &Pubkey,
    nonce: u64,
    dhash: &[u8; 32],
) -> [u8; 32] {
    let mut buf = Vec::with_capacity(12 + 32 + 32 + 8 + 32);
    buf.extend_from_slice(LEAF_PREFIX);
    buf.extend_from_slice(asset_id.as_ref());
    buf.extend_from_slice(owner.as_ref());
    buf.extend_from_slice(&nonce.to_le_bytes());
    buf.extend_from_slice(dhash);
    keccak::hash(&buf).0
}
