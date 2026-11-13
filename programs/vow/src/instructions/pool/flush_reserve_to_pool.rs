use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
    pubkey::Pubkey as SolanaPubkey,
};
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::SPL_STAKE_POOL_PROGRAM_ID;
use crate::errors::VowError;
use crate::pool_math::{parse_pool, require_canonical_pool_ata, required_liquidity};
use crate::state::ProtocolConfig;

/// Permissionless crank. Deposits only the reserve SOL that is NOT already owed to
/// someone into the X1 Foundation SPL stake pool, in exchange for pXNT.
///
/// The reserve always keeps `rent + total_yield_claims + total_pending_unstake`
/// liquid, so yield_balance stays spendable (yield_spend / withdraw_yield) and
/// pending unstakes stay payable no matter who calls this or when.
///
/// No-op on testnet (spl_stake_pool not configured).
///
/// SPL stake pool DepositSol instruction (tag=14):
///   accounts: [pool(mut), withdraw_authority(ro), reserve_stake(mut), depositor(mut,signer),
///              pool_tokens_to(mut), manager_fee(mut), referral_fee(mut), pool_mint(mut),
///              system_program(ro), token_program(ro)]
///   data: [14u8] ++ lamports.to_le_bytes()
#[derive(Accounts)]
pub struct FlushReserveToPool<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

    /// Reserve naked PDA — source of SOL to deposit
    /// CHECK: seeds validated; lamport-only account
    #[account(mut, seeds = [b"reserve"], bump = config.reserve_bump)]
    pub reserve: UncheckedAccount<'info>,

    /// Reserve's canonical pXNT ATA (address pinned in handler) — must be pre-created
    /// (X1 uses a non-standard ATA program; frontend calls ensureReserveAta()).
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

    /// Pool withdraw authority PDA (derived from pool address by stake pool program)
    /// CHECK: verified in handler against pool address + stake pool program
    #[account(mut)]
    pub pool_withdraw_authority: UncheckedAccount<'info>,

    /// Pool's reserve stake account
    /// CHECK: verified in handler against pool data
    #[account(mut)]
    pub pool_reserve_stake: UncheckedAccount<'info>,

    /// Pool manager fee account
    /// CHECK: verified in handler against pool data
    #[account(mut)]
    pub pool_manager_fee_account: UncheckedAccount<'info>,

    /// Referral fee destination — pinned to our own pXNT ATA so any referral share of
    /// the deposit fee comes back to the protocol instead of to whoever cranks.
    /// CHECK: must equal reserve_pool_tokens
    #[account(mut, address = reserve_pool_tokens.key() @ VowError::InvalidPoolTokenAccount)]
    pub pool_referral_fee_account: UncheckedAccount<'info>,

    /// pXNT mint
    #[account(mut, address = config.spl_pool_mint @ VowError::StakeAccountMismatch)]
    pub pool_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    /// CHECK: must be the X1 SPL stake pool program
    pub stake_pool_program: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<FlushReserveToPool>) -> Result<()> {
    if ctx.accounts.config.spl_stake_pool == Pubkey::default() {
        return Ok(());
    }

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
    require!(!pool.has_sol_deposit_authority, VowError::UnsupportedPoolConfig);
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

    // Only SOL above what is owed (yield claims + pending unstakes) and rent is idle.
    let rent_exempt = Rent::get()?.minimum_balance(0);
    let keep = required_liquidity(&ctx.accounts.config, rent_exempt);
    let reserve_lamports = ctx.accounts.reserve.lamports();
    if reserve_lamports <= keep {
        return Ok(());
    }
    let deposit_amount = reserve_lamports - keep;

    let reserve_bump = ctx.accounts.config.reserve_bump;
    let reserve_seeds: &[&[u8]] = &[b"reserve", &[reserve_bump]];

    // DepositSol: tag=14, u64 lamports LE
    let mut data = vec![14u8];
    data.extend_from_slice(&deposit_amount.to_le_bytes());

    let ix = Instruction {
        program_id: stake_pool_program_id,
        accounts: vec![
            AccountMeta::new(ctx.accounts.spl_pool.key(), false),
            AccountMeta::new_readonly(ctx.accounts.pool_withdraw_authority.key(), false),
            AccountMeta::new(ctx.accounts.pool_reserve_stake.key(), false),
            AccountMeta::new(ctx.accounts.reserve.key(), true),
            AccountMeta::new(ctx.accounts.reserve_pool_tokens.key(), false),
            AccountMeta::new(ctx.accounts.pool_manager_fee_account.key(), false),
            AccountMeta::new(ctx.accounts.pool_referral_fee_account.key(), false),
            AccountMeta::new(ctx.accounts.pool_mint.key(), false),
            AccountMeta::new_readonly(anchor_lang::solana_program::system_program::id(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        ],
        data,
    };

    invoke_signed(
        &ix,
        &[
            ctx.accounts.spl_pool.to_account_info(),
            ctx.accounts.pool_withdraw_authority.to_account_info(),
            ctx.accounts.pool_reserve_stake.to_account_info(),
            ctx.accounts.reserve.to_account_info(),
            ctx.accounts.reserve_pool_tokens.to_account_info(),
            ctx.accounts.pool_manager_fee_account.to_account_info(),
            ctx.accounts.pool_referral_fee_account.to_account_info(),
            ctx.accounts.pool_mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        &[reserve_seeds],
    )?;

    Ok(())
}
