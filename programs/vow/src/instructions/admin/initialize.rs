use anchor_lang::prelude::*;
use crate::constants::SHARE_PRECISION;
use crate::errors::VowError;
use crate::events::ProtocolInitialized;
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

    /// X1 Foundation SPL stake pool — read at init to set the correct opening share price.
    /// On testnet pass SystemProgram.programId (no-op: price stays at SHARE_PRECISION).
    /// CHECK: key verified against spl_stake_pool param in handler; data parsed at fixed offsets.
    pub spl_pool: UncheckedAccount<'info>,

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
    config.total_shares = 0;
    config.total_yield_claims = 0;
    config.last_pool_lamports = 0;
    config.total_minted = 0;
    config.merkle_tree = Pubkey::default();
    config.total_pending_unstake = 0;
    config.spl_stake_pool = spl_stake_pool;
    config.spl_pool_mint = spl_pool_mint;
    config.reserve_bump = ctx.bumps.reserve;
    config.bump = ctx.bumps.config;

    // Read the pool's actual pXNT/XNT ratio and use it as the opening share price.
    // Prevents all identities minted after init from inheriting a stale 1.0e12 baseline
    // when the pool is already at a different rate.
    // On testnet spl_stake_pool == SystemProgram.programId → skip, keep SHARE_PRECISION.
    if spl_stake_pool != Pubkey::default()
        && ctx.accounts.spl_pool.key() == spl_stake_pool
    {
        let data = ctx.accounts.spl_pool.try_borrow_data()?;
        if data.len() >= 275 {
            let total_lamports = u64::from_le_bytes(data[259..267].try_into().unwrap());
            let pool_token_supply = u64::from_le_bytes(data[267..275].try_into().unwrap());
            if total_lamports > 0 && pool_token_supply > 0 {
                config.current_share_price = (total_lamports as u128)
                    .checked_mul(SHARE_PRECISION)
                    .ok_or(VowError::SharePriceOverflow)?
                    .checked_div(pool_token_supply as u128)
                    .unwrap_or(SHARE_PRECISION);
                config.last_pool_lamports = total_lamports;
            } else {
                config.current_share_price = SHARE_PRECISION;
            }
        } else {
            config.current_share_price = SHARE_PRECISION;
        }
    } else {
        config.current_share_price = SHARE_PRECISION;
    }

    emit!(ProtocolInitialized {
        admin: config.admin,
        merkle_tree: config.merkle_tree,
    });

    Ok(())
}
