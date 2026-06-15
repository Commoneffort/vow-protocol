use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::{CommitmentRecord, CrGate, VowState};

#[derive(Accounts)]
pub struct RecordFulfillment<'info> {
    #[account(
        mut,
        seeds = [b"commitment", vow_state.owner.as_ref()],
        bump = commitment_record.bump,
    )]
    pub commitment_record: Account<'info, CommitmentRecord>,

    #[account(
        seeds = [b"vow", vow_state.asset_id.as_ref()],
        bump = vow_state.bump,
    )]
    pub vow_state: Account<'info, VowState>,

    // M-1 fix: one-time gate PDA prevents re-recording the same fulfillment.
    #[account(
        init,
        payer = payer,
        space = CrGate::LEN,
        seeds = [b"cr_fulfill", commitment_record.key().as_ref(), vow_state.key().as_ref()],
        bump,
    )]
    pub cr_gate: Account<'info, CrGate>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RecordFulfillment>) -> Result<()> {
    ctx.accounts.cr_gate.bump = ctx.bumps.cr_gate;

    let xnft = &ctx.accounts.vow_state;
    require!(xnft.matured, VowError::NotMatured);

    let record = &mut ctx.accounts.commitment_record;
    let clock = Clock::get()?;

    record.total_xnt_fulfilled = record.total_xnt_fulfilled.saturating_add(xnft.principal_lamports);
    record.commitment_score = compute_score(record);
    record.last_updated = clock.unix_timestamp;

    Ok(())
}

fn compute_score(r: &CommitmentRecord) -> u32 {
    let class_points = r.highest_class_ever as u32 * 100;
    let mint_points = r.total_xnfts_minted.min(50) * 10;
    let fulfilled_ratio = if r.total_xnt_committed > 0 {
        (r.total_xnt_fulfilled as u64 * 100 / r.total_xnt_committed) as u32
    } else {
        0
    };
    class_points + mint_points + fulfilled_ratio
}
