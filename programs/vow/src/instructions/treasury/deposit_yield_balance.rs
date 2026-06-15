use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::events::YieldDeposited;
use crate::state::{VowState, ProtocolConfig};

#[derive(Accounts)]
pub struct DepositYieldBalance<'info> {
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
    )]
    pub vow_state: Account<'info, VowState>,

    /// Reserve PDA — receives the deposited lamports
    /// CHECK: PDA validated by seeds + bump from config
    #[account(
        mut,
        seeds = [b"reserve"],
        bump = config.reserve_bump,
    )]
    pub reserve: UncheckedAccount<'info>,

    /// Anyone can top up an identity's yield_balance: the user, session key, or a dApp server.
    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: Unstake escrow PDA — must not be initialized. Deposits are blocked while
    /// an unstake is in progress because the escrow's lamports_owed was fixed at
    /// begin_unstake time and would not include a post-begin deposit.
    #[account(
        seeds = [b"unstake", vow_state.key().as_ref()],
        bump,
    )]
    pub unstake_escrow: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<DepositYieldBalance>, amount: u64) -> Result<()> {
    require!(amount > 0, VowError::InsufficientYieldBalance);
    require!(ctx.accounts.vow_state.active_stake, VowError::IdentityInactive);
    require!(ctx.accounts.unstake_escrow.data_is_empty(), VowError::AlreadyUnstaking);

    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to: ctx.accounts.reserve.to_account_info(),
            },
        ),
        amount,
    )?;

    ctx.accounts.vow_state.yield_balance =
        ctx.accounts.vow_state.yield_balance.saturating_add(amount);
    ctx.accounts.config.total_yield_claims =
        ctx.accounts.config.total_yield_claims.saturating_add(amount);

    emit!(YieldDeposited {
        asset_id: ctx.accounts.vow_state.asset_id,
        depositor: ctx.accounts.depositor.key(),
        amount,
    });

    Ok(())
}
