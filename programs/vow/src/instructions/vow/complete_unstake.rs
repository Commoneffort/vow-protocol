use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::events::VowUnstaked;
use crate::state::{VowState, ProtocolConfig, UnstakeEscrow};

/// Called after ≥1 epoch since begin_unstake. Withdraws principal + yield from
/// the reserve back to the owner. The VOW state is NOT closed — it remains
/// on-chain permanently as a historical identity credential with active_stake=false.
/// Call activateStake() to re-activate with a new stake position.
#[derive(Accounts)]
pub struct CompleteUnstake<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    /// VOW state is NOT closed — it persists as a permanent identity credential.
    #[account(
        mut,
        seeds = [b"vow", vow_state.asset_id.as_ref()],
        bump = vow_state.bump,
        has_one = owner @ VowError::InvalidOwner,
    )]
    pub vow_state: Account<'info, VowState>,

    #[account(
        mut,
        seeds = [b"unstake", vow_state.key().as_ref()],
        bump = unstake_escrow.bump,
        has_one = owner,
        close = owner,
    )]
    pub unstake_escrow: Account<'info, UnstakeEscrow>,

    /// Reserve PDA — source of withdrawal lamports
    /// CHECK: PDA validated by seeds + bump from config
    #[account(
        mut,
        seeds = [b"reserve"],
        bump = config.reserve_bump,
    )]
    pub reserve: UncheckedAccount<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,

    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<CompleteUnstake>) -> Result<()> {
    let escrow = &ctx.accounts.unstake_escrow;

    require!(
        ctx.accounts.clock.epoch > escrow.deactivation_epoch,
        VowError::StakeNotDeactivated
    );

    let lamports_owed = escrow.lamports_owed;
    let asset_id = ctx.accounts.vow_state.asset_id;
    let reserve_bump = ctx.accounts.config.reserve_bump;
    let total_pending = ctx.accounts.config.total_pending_unstake;

    let reserve_lamports = ctx.accounts.reserve.lamports();
    require!(reserve_lamports > 0, VowError::InsufficientYieldBalance);

    // Pro-rata: if the reserve can cover all pending claims, pay in full.
    // If reserve is short, each unstaker gets their proportional share.
    let pay_amount = if total_pending == 0 || reserve_lamports >= total_pending {
        lamports_owed
    } else {
        ((lamports_owed as u128)
            .checked_mul(reserve_lamports as u128)
            .unwrap_or(0)
            .checked_div(total_pending as u128)
            .unwrap_or(0)) as u64
    };

    require!(pay_amount > 0, VowError::InsufficientYieldBalance);

    let reserve_seeds: &[&[u8]] = &[b"reserve", &[reserve_bump]];

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.reserve.to_account_info(),
                to: ctx.accounts.owner.to_account_info(),
            },
            &[reserve_seeds],
        ),
        pay_amount,
    )?;

    ctx.accounts.config.total_pending_unstake = ctx.accounts.config.total_pending_unstake
        .saturating_sub(lamports_owed);

    // Transition to Dormant Identity. VOW account stays on-chain permanently.
    let idnft = &mut ctx.accounts.vow_state;
    let clock = &ctx.accounts.clock;

    let stake_seconds = clock.unix_timestamp
        .saturating_sub(idnft.current_stake_started_at)
        .max(0) as u64;
    let stake_days = stake_seconds / 86_400;
    idnft.cumulative_stake_days = idnft.cumulative_stake_days.saturating_add(stake_days);

    if idnft.matured {
        idnft.total_fulfilled = idnft.total_fulfilled.saturating_add(1);
    }

    idnft.active_stake = false;
    idnft.sessions_invalidated_at = clock.unix_timestamp;

    emit!(VowUnstaked {
        asset_id,
        owner: ctx.accounts.owner.key(),
        lamports_returned: pay_amount,
    });

    Ok(())
}
