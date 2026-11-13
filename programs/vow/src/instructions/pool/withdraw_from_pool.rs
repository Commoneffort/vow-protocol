use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
    pubkey::Pubkey as SolanaPubkey,
};
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{PPM, SPL_STAKE_POOL_PROGRAM_ID};
use crate::errors::VowError;
use crate::pool_math::{parse_pool, require_canonical_pool_ata, required_liquidity};
use crate::state::ProtocolConfig;

/// Permissionless crank — callable only when the reserve's liquid SOL is below what
/// the protocol owes right now (`rent + total_yield_claims + total_pending_unstake`).
///
/// Redeems just enough pXNT (grossed up for the pool's withdrawal fee) to close that
/// shortfall. Reverts with `ReserveSufficient` otherwise, so nobody can gratuitously
/// pull the protocol's position out of the pool.
///
/// Covers every fixed obligation — not just unstakes — so harvested / deposited
/// yield_balance is always spendable. If one call leaves a residual shortfall (pool
/// rounding), call it again.
///
/// SPL stake pool WithdrawSol instruction (tag=16):
///   accounts: [pool(mut), withdraw_authority(ro), user_transfer_authority(signer),
///              pool_tokens_from(mut), reserve_stake(mut), lamports_to(mut),
///              manager_fee(mut), pool_mint(mut), clock(ro), stake_history(ro),
///              stake_program(ro), token_program(ro)]
///   data: [16u8] ++ pool_tokens.to_le_bytes()
#[derive(Accounts)]
pub struct WithdrawFromPool<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

    /// Reserve — receives SOL after withdrawal, and signs as pool token authority
    /// CHECK: seeds validated; lamport-only account
    #[account(mut, seeds = [b"reserve"], bump = config.reserve_bump)]
    pub reserve: UncheckedAccount<'info>,

    /// Reserve's canonical pXNT ATA — tokens to burn (address pinned in handler)
    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = reserve,
    )]
    pub reserve_pool_tokens: Account<'info, TokenAccount>,

    /// X1 Foundation SPL stake pool account
    /// CHECK: address verified against config.spl_stake_pool; data parsed in handler
    #[account(mut, address = config.spl_stake_pool @ VowError::StakeAccountMismatch)]
    pub spl_pool: UncheckedAccount<'info>,

    /// Pool withdraw authority PDA
    /// CHECK: verified in handler
    pub pool_withdraw_authority: UncheckedAccount<'info>,

    /// Pool's reserve stake account
    /// CHECK: verified in handler against pool data
    #[account(mut)]
    pub pool_reserve_stake: UncheckedAccount<'info>,

    /// Pool manager fee account
    /// CHECK: verified in handler against pool data
    #[account(mut)]
    pub pool_manager_fee_account: UncheckedAccount<'info>,

    /// pXNT mint
    #[account(mut, address = config.spl_pool_mint @ VowError::StakeAccountMismatch)]
    pub pool_mint: Account<'info, Mint>,

    /// CHECK: Clock sysvar
    #[account(address = anchor_lang::solana_program::sysvar::clock::id())]
    pub clock: UncheckedAccount<'info>,

    /// CHECK: Stake history sysvar
    #[account(address = anchor_lang::solana_program::sysvar::stake_history::id())]
    pub stake_history: UncheckedAccount<'info>,

    /// CHECK: Native stake program
    #[account(address = anchor_lang::solana_program::stake::program::id())]
    pub stake_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,

    /// CHECK: must be the X1 SPL stake pool program
    pub stake_pool_program: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<WithdrawFromPool>) -> Result<()> {
    if ctx.accounts.config.spl_stake_pool == Pubkey::default() {
        return Ok(());
    }

    // Guard: only callable when the reserve can't cover what is owed right now.
    let rent_exempt = Rent::get()?.minimum_balance(0);
    let required = required_liquidity(&ctx.accounts.config, rent_exempt);
    let reserve_lamports = ctx.accounts.reserve.lamports();
    require!(reserve_lamports < required, VowError::ReserveSufficient);
    let shortfall = required - reserve_lamports;

    let stake_pool_program_id = SolanaPubkey::try_from(SPL_STAKE_POOL_PROGRAM_ID)
        .map_err(|_| error!(VowError::StakeAccountMismatch))?;
    require!(
        ctx.accounts.stake_pool_program.key() == stake_pool_program_id,
        VowError::StakeAccountMismatch
    );
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
    require!(!pool.has_sol_withdraw_authority, VowError::UnsupportedPoolConfig);
    require!(
        ctx.accounts.pool_reserve_stake.key() == pool.reserve_stake,
        VowError::StakeAccountMismatch
    );
    require!(
        ctx.accounts.pool_manager_fee_account.key() == pool.manager_fee_account,
        VowError::StakeAccountMismatch
    );
    let (expected_withdraw_authority, _) = Pubkey::find_program_address(
        &[ctx.accounts.spl_pool.key().as_ref(), b"withdraw"],
        &stake_pool_program_id,
    );
    require!(
        ctx.accounts.pool_withdraw_authority.key() == expected_withdraw_authority,
        VowError::StakeAccountMismatch
    );
    require!(pool.pool_token_supply > 0 && pool.total_lamports > 0, VowError::EmptyReserve);

    // Gross up for the withdrawal fee, then convert lamports → pool tokens (ceil).
    let w = PPM - (pool.withdrawal_fee_ppm as u128).min(PPM - 1);
    let gross_lamports = ((shortfall as u128) * PPM + w - 1) / w;
    let tokens = gross_lamports
        .checked_mul(pool.pool_token_supply as u128)
        .ok_or(VowError::MathOverflow)?
        .checked_add(pool.total_lamports as u128 - 1)
        .ok_or(VowError::MathOverflow)?
        / pool.total_lamports as u128;
    // +1 token absorbs the pool's own fee rounding so one call normally suffices.
    let tokens_to_burn = (tokens as u64)
        .saturating_add(1)
        .min(ctx.accounts.reserve_pool_tokens.amount);
    require!(tokens_to_burn > 0, VowError::EmptyReserve);

    let reserve_bump = ctx.accounts.config.reserve_bump;
    let reserve_seeds: &[&[u8]] = &[b"reserve", &[reserve_bump]];

    // WithdrawSol: tag=16, u64 pool_tokens LE
    let mut data = vec![16u8];
    data.extend_from_slice(&tokens_to_burn.to_le_bytes());

    let ix = Instruction {
        program_id: stake_pool_program_id,
        accounts: vec![
            AccountMeta::new(ctx.accounts.spl_pool.key(), false),
            AccountMeta::new_readonly(ctx.accounts.pool_withdraw_authority.key(), false),
            AccountMeta::new_readonly(ctx.accounts.reserve.key(), true), // user_transfer_authority
            AccountMeta::new(ctx.accounts.reserve_pool_tokens.key(), false),
            AccountMeta::new(ctx.accounts.pool_reserve_stake.key(), false),
            AccountMeta::new(ctx.accounts.reserve.key(), false), // lamports_to
            AccountMeta::new(ctx.accounts.pool_manager_fee_account.key(), false),
            AccountMeta::new(ctx.accounts.pool_mint.key(), false),
            AccountMeta::new_readonly(ctx.accounts.clock.key(), false),
            AccountMeta::new_readonly(ctx.accounts.stake_history.key(), false),
            AccountMeta::new_readonly(ctx.accounts.stake_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        ],
        data,
    };

    invoke_signed(
        &ix,
        &[
            ctx.accounts.spl_pool.to_account_info(),
            ctx.accounts.pool_withdraw_authority.to_account_info(),
            ctx.accounts.reserve.to_account_info(),
            ctx.accounts.reserve_pool_tokens.to_account_info(),
            ctx.accounts.pool_reserve_stake.to_account_info(),
            ctx.accounts.reserve.to_account_info(),
            ctx.accounts.pool_manager_fee_account.to_account_info(),
            ctx.accounts.pool_mint.to_account_info(),
            ctx.accounts.clock.to_account_info(),
            ctx.accounts.stake_history.to_account_info(),
            ctx.accounts.stake_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        &[reserve_seeds],
    )?;

    Ok(())
}
