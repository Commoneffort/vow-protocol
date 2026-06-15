use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
    pubkey::Pubkey as SolanaPubkey,
};
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::constants::SPL_STAKE_POOL_PROGRAM_ID;
use crate::errors::VowError;
use crate::state::ProtocolConfig;

/// Permissionless crank. Deposits all reserve SOL (minus rent-exempt minimum) into the
/// X1 Foundation SPL stake pool. The reserve receives pXNT pool tokens in exchange.
/// This is what actually earns yield — the pXNT appreciates as validators earn rewards.
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

    /// Reserve's ATA for pXNT — must be pre-created (X1 uses a non-standard ATA program;
    /// frontend calls ensureReserveAta() before the first flush).
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

    /// Pool's reserve stake account — read from pool account data at offset 131
    /// CHECK: verified in handler against pool data
    #[account(mut)]
    pub pool_reserve_stake: UncheckedAccount<'info>,

    /// Pool manager fee account — read from pool account data at offset 195
    /// CHECK: verified in handler against pool data
    #[account(mut)]
    pub pool_manager_fee_account: UncheckedAccount<'info>,

    /// Referral fee destination — pass same as manager_fee if no referral program
    /// CHECK: passed through to stake pool program
    #[account(mut)]
    pub pool_referral_fee_account: UncheckedAccount<'info>,

    /// pXNT mint
    #[account(mut, address = config.spl_pool_mint @ VowError::StakeAccountMismatch)]
    pub pool_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    /// CHECK: must be the standard SPL stake pool program
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

    // Verify pool accounts from pool account data.
    // X1 StakePool layout (Borsh, no discriminator):
    //   0: version(1) 1: account_type(1) 2: manager(32) 34: staker(32) 66: stake_deposit_authority(32)
    //   98: bump(1) 99: validator_list(32) 131: reserve_stake(32) 163: pool_mint(32) 195: manager_fee(32)
    let pool_data = ctx.accounts.spl_pool.try_borrow_data()?;
    require!(pool_data.len() >= 227, VowError::InvalidStakeAccount);
    let reserve_stake_key = Pubkey::new_from_array(pool_data[131..163].try_into().unwrap());
    let manager_fee_key = Pubkey::new_from_array(pool_data[195..227].try_into().unwrap());
    drop(pool_data);

    require!(
        ctx.accounts.pool_reserve_stake.key() == reserve_stake_key,
        VowError::StakeAccountMismatch
    );
    require!(
        ctx.accounts.pool_manager_fee_account.key() == manager_fee_key,
        VowError::StakeAccountMismatch
    );

    // Verify pool withdraw authority PDA
    let (expected_withdraw_authority, _) = Pubkey::find_program_address(
        &[ctx.accounts.spl_pool.key().as_ref(), b"withdraw"],
        &stake_pool_program_id,
    );
    require!(
        ctx.accounts.pool_withdraw_authority.key() == expected_withdraw_authority,
        VowError::StakeAccountMismatch
    );

    let reserve_lamports = ctx.accounts.reserve.lamports();
    let rent = Rent::get()?;
    let rent_exempt = rent.minimum_balance(0);
    if reserve_lamports <= rent_exempt {
        return Ok(());
    }

    let deposit_amount = reserve_lamports - rent_exempt;
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
