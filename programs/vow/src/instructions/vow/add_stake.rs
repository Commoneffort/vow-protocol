use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::SHARE_PRECISION;
use crate::errors::VowError;
use crate::events::StakeAdded;
use crate::instructions::harvest::settle_idnft;
use crate::state::{ProtocolConfig, VowState, class_for_stake, lock_duration};

#[derive(Accounts)]
pub struct AddStake<'info> {
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

    /// Reserve PDA — receives the additional staked lamports
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

pub fn handler(ctx: Context<AddStake>, lamports_to_add: u64) -> Result<()> {
    require!(lamports_to_add > 0, VowError::InsufficientStake);

    let idnft = &mut ctx.accounts.vow_state;
    require!(idnft.active_stake, VowError::IdentityInactive);
    // Shares are zeroed by begin_unstake while active_stake remains true until complete_unstake.
    // Adding stake in that window would mint orphaned shares (inflating total_shares with no owner).
    require!(idnft.shares > 0, VowError::AlreadyUnstaking);

    // Settle existing gain at current price before touching shares
    settle_idnft(idnft, &ctx.accounts.config)?;

    // Deposit additional principal into reserve
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.reserve.to_account_info(),
            },
        ),
        lamports_to_add,
    )?;

    let new_principal = idnft.principal_lamports
        .checked_add(lamports_to_add)
        .ok_or(VowError::MathOverflow)?;

    // class_for_stake is a total function for amounts >= 1 XNT — always returns a valid
    // class or InsufficientStake. Adding lamports can only keep or increase the class.
    let new_class = class_for_stake(new_principal)?;

    // Mint new shares at current price for the added lamports only
    let new_shares = (lamports_to_add as u128)
        .checked_mul(SHARE_PRECISION)
        .ok_or(VowError::MathOverflow)?
        .checked_div(ctx.accounts.config.current_share_price)
        .ok_or(VowError::MathOverflow)?;

    let clock = Clock::get()?;
    let old_class = idnft.class;
    let class_upgraded = new_class > old_class;

    if class_upgraded {
        idnft.unlock_at = clock.unix_timestamp + lock_duration(new_class);
        idnft.matured = false;
        idnft.class = new_class;
        if new_class > idnft.highest_class_ever {
            idnft.highest_class_ever = new_class;
        }
    }

    idnft.principal_lamports = new_principal;
    idnft.shares = idnft.shares
        .checked_add(new_shares)
        .ok_or(VowError::MathOverflow)?;

    let config = &mut ctx.accounts.config;
    config.total_shares = config.total_shares
        .checked_add(new_shares)
        .ok_or(VowError::MathOverflow)?;

    emit!(StakeAdded {
        asset_id: idnft.asset_id,
        owner: idnft.owner,
        lamports_added: lamports_to_add,
        new_principal,
        old_class,
        new_class,
        new_unlock_at: idnft.unlock_at,
    });

    Ok(())
}
