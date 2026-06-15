use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::VowError;
use crate::events::VowStakeActivated;
use crate::instructions::harvest::settle_idnft;
use crate::state::{VowState, ProtocolConfig, YieldMode, class_for_stake, lock_duration};

#[derive(Accounts)]
pub struct ActivateStake<'info> {
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

    /// Reserve PDA — receives the new stake deposit
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
}

pub fn handler(
    ctx: Context<ActivateStake>,
    stake_lamports: u64,
    yield_mode: YieldMode,
) -> Result<()> {
    let idnft = &mut ctx.accounts.vow_state;
    require!(!idnft.active_stake, VowError::IdentityAlreadyActive);

    settle_idnft(idnft, &ctx.accounts.config)?;

    let new_class = class_for_stake(stake_lamports)?;
    let clock = Clock::get()?;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.reserve.to_account_info(),
            },
        ),
        stake_lamports,
    )?;

    let config_ref = &ctx.accounts.config;
    let new_shares = (stake_lamports as u128)
        .checked_mul(SHARE_PRECISION)
        .ok_or(VowError::MathOverflow)?
        .checked_div(config_ref.current_share_price)
        .ok_or(VowError::MathOverflow)?;

    let unlock_at = clock.unix_timestamp + lock_duration(new_class);

    let old_shares = idnft.shares;
    idnft.class = new_class;
    idnft.principal_lamports = stake_lamports;
    idnft.shares = new_shares;
    idnft.last_share_price = ctx.accounts.config.current_share_price;
    idnft.accrued_gain = 0;
    idnft.yield_mode = yield_mode;
    idnft.unlock_at = unlock_at;
    idnft.matured = false;
    idnft.active_stake = true;
    idnft.sessions_invalidated_at = clock.unix_timestamp;
    idnft.current_stake_started_at = clock.unix_timestamp;

    idnft.total_commitments = idnft.total_commitments.saturating_add(1);
    if new_class > idnft.highest_class_ever {
        idnft.highest_class_ever = new_class;
    }

    let config = &mut ctx.accounts.config;
    // Remove any orphaned shares (begin_unstake zeroes shares but active_stake stays true until
    // complete_unstake; shares could be non-zero here only from a pre-fix add_stake exploit).
    config.total_shares = config.total_shares.saturating_sub(old_shares);
    config.total_shares = config.total_shares
        .checked_add(new_shares)
        .ok_or(VowError::MathOverflow)?;

    emit!(VowStakeActivated {
        asset_id: idnft.asset_id,
        owner: idnft.owner,
        new_class,
        stake_lamports,
        shares: new_shares,
        unlock_at,
    });

    Ok(())
}
