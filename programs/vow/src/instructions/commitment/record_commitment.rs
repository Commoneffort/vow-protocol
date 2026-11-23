use anchor_lang::prelude::*;
use crate::state::{CommitmentRecord, CrGate, VowState};
use crate::constants::LOCK_SECONDS;
use crate::errors::VowError;

#[derive(Accounts)]
pub struct RecordCommitment<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = CommitmentRecord::LEN,
        seeds = [b"commitment", vow_state.owner.as_ref()],
        bump,
    )]
    pub commitment_record: Account<'info, CommitmentRecord>,

    #[account(
        seeds = [b"vow", vow_state.asset_id.as_ref()],
        bump = vow_state.bump,
    )]
    pub vow_state: Account<'info, VowState>,

    // M-1 fix: one-time gate PDA bound to (commitment_record, vow_state).
    // Using `init` (not init_if_needed) makes re-recording idempotent-safe:
    // the second call will fail with AccountAlreadyInitialized.
    #[account(
        init,
        payer = payer,
        space = CrGate::LEN,
        seeds = [b"cr_commit", commitment_record.key().as_ref(), vow_state.key().as_ref()],
        bump,
    )]
    pub cr_gate: Account<'info, CrGate>,

    /// Must be the identity owner: these records are one-shot, so a third party could
    /// otherwise freeze them at a low value.
    #[account(
        mut,
        address = vow_state.owner @ VowError::InvalidOwner,
    )]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RecordCommitment>) -> Result<()> {
    ctx.accounts.cr_gate.bump = ctx.bumps.cr_gate;

    let idnft = &ctx.accounts.vow_state;
    let record = &mut ctx.accounts.commitment_record;
    let clock = Clock::get()?;

    record.wallet = idnft.owner;
    record.total_xnfts_minted = record.total_xnfts_minted.saturating_add(1);
    record.total_xnt_committed = record.total_xnt_committed.saturating_add(idnft.principal_lamports);
    if idnft.class > record.highest_class_ever {
        record.highest_class_ever = idnft.class;
    }
    let lock_days = (LOCK_SECONDS[idnft.class as usize] / 86_400) as u64;
    record.total_commitment_days = record.total_commitment_days.saturating_add(lock_days);
    record.commitment_score = compute_score(record);
    record.last_updated = clock.unix_timestamp;

    if record.bump == 0 {
        record.bump = ctx.bumps.commitment_record;
    }

    Ok(())
}

fn compute_score(r: &CommitmentRecord) -> u32 {
    let class_points = r.highest_class_ever as u32 * 100;
    let mint_points = r.total_xnfts_minted.min(50) * 10;
    let fulfilled_ratio = if r.total_xnt_committed > 0 {
        // Capped at 100%: fulfilled principal can never exceed what was committed.
        (r.total_xnt_fulfilled.min(r.total_xnt_committed) as u128 * 100
            / r.total_xnt_committed as u128) as u32
    } else {
        0
    };
    class_points + mint_points + fulfilled_ratio
}
