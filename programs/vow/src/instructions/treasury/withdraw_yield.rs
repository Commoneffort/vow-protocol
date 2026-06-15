use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::events::YieldWithdrawn;
use crate::state::{VowState, ProtocolConfig};

#[derive(Accounts)]
pub struct WithdrawYield<'info> {
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

    /// Reserve PDA — source of yield lamports
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

pub fn handler(ctx: Context<WithdrawYield>, amount: Option<u64>) -> Result<()> {

    let idnft = &mut ctx.accounts.vow_state;
    let withdraw_amount = amount.unwrap_or(idnft.yield_balance);

    require!(idnft.yield_balance >= withdraw_amount, VowError::InsufficientYieldBalance);
    require!(withdraw_amount > 0, VowError::InsufficientYieldBalance);
    require!(ctx.accounts.reserve.lamports() >= withdraw_amount, VowError::InsufficientYieldBalance);

    idnft.yield_balance -= withdraw_amount;
    ctx.accounts.config.total_yield_claims =
        ctx.accounts.config.total_yield_claims.saturating_sub(withdraw_amount);

    let reserve_bump = ctx.accounts.config.reserve_bump;
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
        withdraw_amount,
    )?;

    emit!(YieldWithdrawn {
        asset_id: idnft.asset_id,
        owner: ctx.accounts.owner.key(),
        amount: withdraw_amount,
    });

    Ok(())
}
