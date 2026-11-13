//! Minimal dApp that spends a user's Vow yield_balance via CPI, signing with its
//! `[b"vow_caller"]` PDA — the pattern every whitelisted app must follow.
//!
//! ix data: amount: u64 LE
//! accounts (same order as vow::yield_spend, then the vow program):
//!   0 config, 1 vow_state(w), 2 session_account(w), 3 calling_program (= this program),
//!   4 app_registry, 5 reserve(w), 6 destination(w), 7 session_signer(s),
//!   8 system_program, 9 caller_authority (this program's vow_caller PDA), 10 vow program
use anchor_lang::solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    hash::hash,
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if accounts.len() < 11 || data.len() < 8 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    let amount = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let (authority, bump) = Pubkey::find_program_address(&[b"vow_caller"], program_id);
    if *accounts[9].key != authority {
        return Err(ProgramError::InvalidSeeds);
    }

    let mut ix_data = hash(b"global:yield_spend").to_bytes()[..8].to_vec();
    ix_data.extend_from_slice(&amount.to_le_bytes());

    let metas = vec![
        AccountMeta::new(*accounts[0].key, false),
        AccountMeta::new(*accounts[1].key, false),
        AccountMeta::new(*accounts[2].key, false),
        AccountMeta::new_readonly(*accounts[3].key, false),
        AccountMeta::new_readonly(*accounts[4].key, false),
        AccountMeta::new(*accounts[5].key, false),
        AccountMeta::new(*accounts[6].key, false),
        AccountMeta::new_readonly(*accounts[7].key, true),
        AccountMeta::new_readonly(*accounts[8].key, false),
        AccountMeta::new_readonly(authority, true),
    ];
    let ix = Instruction { program_id: *accounts[10].key, accounts: metas, data: ix_data };
    invoke_signed(&ix, &accounts[..11], &[&[b"vow_caller", &[bump]]])
}
