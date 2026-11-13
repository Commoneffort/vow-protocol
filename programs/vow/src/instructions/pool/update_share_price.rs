use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::errors::VowError;
use crate::events::SharePriceUpdated;
use crate::pool_math::{nav_share_price, parse_pool, require_canonical_pool_ata, NavInputs};
use crate::state::ProtocolConfig;

/// Permissionless crank. Recomputes the share price from the protocol's real,
/// redeemable assets (NAV — see `pool_math`) rather than the raw pool exchange rate,
/// so pool fees, surplus and liabilities are reflected and every share is worth an
/// equal slice of what can actually be paid out.
///
/// Also records the pool's `last_update_epoch` and fees; value-moving instructions
/// (mint, add_stake, activate_stake, harvest, begin_unstake, update_yield_mode)
/// require the price to be fresh for the current epoch. Clients should prepend this
/// instruction to those transactions.
#[derive(Accounts)]
pub struct UpdateSharePrice<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    /// The X1 Foundation SPL stake pool account.
    /// CHECK: verified against config.spl_stake_pool; data parsed by `parse_pool`.
    #[account(
        address = config.spl_stake_pool @ VowError::StakeAccountMismatch,
    )]
    pub spl_pool: UncheckedAccount<'info>,

    /// CHECK: PDA validated by seeds + bump from config; lamport balance is read
    #[account(seeds = [b"reserve"], bump = config.reserve_bump)]
    pub reserve: UncheckedAccount<'info>,

    /// Reserve's canonical pXNT ATA (address pinned in handler).
    #[account(
        token::authority = reserve,
        constraint = reserve_pool_tokens.mint == config.spl_pool_mint @ VowError::InvalidPoolTokenAccount,
    )]
    pub reserve_pool_tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UpdateSharePrice>) -> Result<()> {
    // If SPL pool is not yet configured (testnet), skip — keep current price.
    if ctx.accounts.config.spl_stake_pool == Pubkey::default() {
        return Ok(());
    }

    require_canonical_pool_ata(
        &ctx.accounts.reserve_pool_tokens.key(),
        &ctx.accounts.reserve.key(),
        &ctx.accounts.token_program.key(),
        &ctx.accounts.config.spl_pool_mint,
    )?;

    let pool = {
        let data = ctx.accounts.spl_pool.try_borrow_data()?;
        parse_pool(&data)?
    };
    require_keys_eq!(pool.pool_mint, ctx.accounts.config.spl_pool_mint, VowError::StakeAccountMismatch);
    if pool.pool_token_supply == 0 || pool.total_lamports == 0 {
        return Ok(());
    }

    let rent_exempt = Rent::get()?.minimum_balance(0);
    let config = &mut ctx.accounts.config;
    let old_price = config.current_share_price;

    let nav = nav_share_price(&NavInputs {
        reserve_lamports: ctx.accounts.reserve.lamports(),
        rent_exempt,
        total_yield_claims: config.total_yield_claims,
        total_pending_unstake: config.total_pending_unstake,
        pxnt_amount: ctx.accounts.reserve_pool_tokens.amount,
        pool_total_lamports: pool.total_lamports,
        pool_token_supply: pool.pool_token_supply,
        deposit_fee_ppm: pool.deposit_fee_ppm,
        withdrawal_fee_ppm: pool.withdrawal_fee_ppm,
        total_shares: config.total_shares,
    })?;

    config.last_pool_lamports = pool.total_lamports;
    config.deposit_fee_ppm = pool.deposit_fee_ppm;
    config.withdrawal_fee_ppm = pool.withdrawal_fee_ppm;
    if !nav.solvent {
        // Liabilities exceed every asset (e.g. a pool slash). Pricing at ~0 would let
        // newcomers' deposits silently cover the hole and first exits drain the rest, so
        // leave the price untouched and mark it stale: every value-moving instruction
        // halts (PriceStale) until the protocol is solvent again or is upgraded.
        config.price_epoch = 0;
        msg!("update_share_price: protocol insolvent — value-moving instructions halted");
        return Ok(());
    }
    let new_price = nav.price;
    config.current_share_price = new_price;
    config.price_epoch = pool.last_update_epoch;

    emit!(SharePriceUpdated {
        old_price,
        new_price,
        pool_lamports: pool.total_lamports,
        total_shares: config.total_shares,
    });

    Ok(())
}
