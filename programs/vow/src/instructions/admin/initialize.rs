use anchor_lang::prelude::*;
use crate::constants::SHARE_PRECISION;
use crate::errors::VowError;
use crate::events::ProtocolInitialized;
use crate::program::Vow;
use crate::state::ProtocolConfig;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = ProtocolConfig::LEN,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    /// Reserve PDA — lamport-only; receives SOL from mints
    /// CHECK: validated by seeds; lamport-only account
    #[account(
        seeds = [b"reserve"],
        bump,
    )]
    pub reserve: UncheckedAccount<'info>,

    /// Only the program's upgrade authority may initialize. Without this, whoever
    /// called `initialize` first (on a fresh deploy) would become admin.
    #[account(
        constraint = program.programdata_address()? == Some(program_data.key()) @ VowError::Unauthorized,
    )]
    pub program: Program<'info, Vow>,

    #[account(
        constraint = program_data.upgrade_authority_address == Some(admin.key()) @ VowError::Unauthorized,
    )]
    pub program_data: Account<'info, ProgramData>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    spl_stake_pool: Pubkey,
    spl_pool_mint: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.current_share_price = SHARE_PRECISION;
    config.total_shares = 0;
    config.total_yield_claims = 0;
    config.last_pool_lamports = 0;
    config.total_minted = 0;
    // price_epoch = 0 → stale: minting is blocked until the first update_share_price,
    // which sets the opening price from the pool (see pool_math::nav_share_price).
    config.price_epoch = 0;
    config.deposit_fee_ppm = 0;
    config.withdrawal_fee_ppm = 0;
    config.insolvent = false;
    config._reserved = [0u8; 15];
    config.total_pending_unstake = 0;
    config.spl_stake_pool = spl_stake_pool;
    config.spl_pool_mint = spl_pool_mint;
    config.reserve_bump = ctx.bumps.reserve;
    config.bump = ctx.bumps.config;

    emit!(ProtocolInitialized { admin: config.admin });
    Ok(())
}
