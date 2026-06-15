use anchor_lang::prelude::*;
use crate::constants::SHARE_PRECISION;
use crate::errors::VowError;
use crate::events::{VowMatured, VowUnstakeBegun};
use crate::instructions::harvest::settle_idnft;
use crate::state::{VowState, ProtocolConfig, UnstakeEscrow};

/// Initiates unstaking. Locks the principal + any Treasury yield into an escrow
/// and removes shares from global accounting. The VOW account itself is NOT
/// closed — it persists as a permanent on-chain identity credential.
#[derive(Accounts)]
pub struct BeginUnstake<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"vow", vow_state.asset_id.as_ref()],
        bump = vow_state.bump,
        has_one = owner @ VowError::InvalidOwner,
    )]
    pub vow_state: Account<'info, VowState>,

    #[account(
        init,
        payer = owner,
        space = UnstakeEscrow::LEN,
        seeds = [b"unstake", vow_state.key().as_ref()],
        bump,
    )]
    pub unstake_escrow: Account<'info, UnstakeEscrow>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BeginUnstake>) -> Result<()> {
    let idnft = &mut ctx.accounts.vow_state;
    require!(idnft.active_stake, VowError::IdentityInactive);

    let clock = Clock::get()?;
    if !idnft.matured && clock.unix_timestamp >= idnft.unlock_at {
        idnft.matured = true;
        emit!(VowMatured { asset_id: idnft.asset_id, owner: idnft.owner, class: idnft.class });
    }
    require!(idnft.matured, VowError::NotMatured);

    settle_idnft(idnft, &ctx.accounts.config)?;

    let position_value = (idnft.shares as u128)
        .checked_mul(ctx.accounts.config.current_share_price)
        .ok_or(VowError::MathOverflow)?
        .checked_div(SHARE_PRECISION)
        .unwrap_or(0) as u64;

    let lamports_owed = position_value
        .checked_add(idnft.yield_balance)
        .ok_or(VowError::MathOverflow)?;

    let config = &mut ctx.accounts.config;
    config.total_shares = config.total_shares.saturating_sub(idnft.shares);
    config.total_yield_claims = config.total_yield_claims.saturating_sub(idnft.yield_balance);
    config.total_pending_unstake = config.total_pending_unstake
        .checked_add(lamports_owed)
        .ok_or(VowError::MathOverflow)?;

    // Zero out the financial position; active_stake stays true until complete_unstake
    idnft.shares = 0;
    idnft.yield_balance = 0;

    let escrow = &mut ctx.accounts.unstake_escrow;
    escrow.vow_state = idnft.key();
    escrow.owner = ctx.accounts.owner.key();
    escrow.lamports_owed = lamports_owed;
    escrow.deactivation_epoch = clock.epoch;
    escrow.bump = ctx.bumps.unstake_escrow;

    emit!(VowUnstakeBegun {
        asset_id: idnft.asset_id,
        owner: idnft.owner,
        lamports_owed,
    });

    Ok(())
}
