use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
    pubkey::Pubkey as SolanaPubkey,
};
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::constants::SPL_STAKE_POOL_PROGRAM_ID;
use crate::errors::VowError;
use crate::state::{ProtocolConfig, UnstakeEscrow};

/// Permissionless crank — but only callable when the reserve's SOL balance is
/// genuinely insufficient to cover a specific pending unstake payout.
///
/// Redeems just enough pXNT from the X1 Foundation SPL stake pool to cover
/// `unstake_escrow.lamports_owed`. Reverts if the reserve already has enough SOL,
/// preventing anyone from gratuitously draining the pXNT position.
///
/// Intended call sequence before complete_unstake:
///   1. Check reserve.lamports() < escrow.lamports_owed client-side
///   2. If short, call withdraw_from_pool (passes this escrow as proof of need)
///   3. Call complete_unstake
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

    /// The pending unstake that justifies this withdrawal.
    /// Proves there is a real payout that the reserve cannot currently cover.
    #[account(
        seeds = [b"unstake", unstake_escrow.vow_state.as_ref()],
        bump = unstake_escrow.bump,
    )]
    pub unstake_escrow: Account<'info, UnstakeEscrow>,

    /// Reserve's pXNT token account — tokens to burn
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

    /// Pool's reserve stake account — read from pool data at offset 131
    /// CHECK: verified in handler against pool data
    #[account(mut)]
    pub pool_reserve_stake: UncheckedAccount<'info>,

    /// Pool manager fee account — read from pool data at offset 195
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

    // Guard: only callable when reserve genuinely cannot cover this escrow's payout.
    let reserve_lamports = ctx.accounts.reserve.lamports();
    let lamports_owed = ctx.accounts.unstake_escrow.lamports_owed;
    require!(reserve_lamports < lamports_owed, VowError::ReserveSufficient);

    let lamports_needed = lamports_owed - reserve_lamports;

    let stake_pool_program_id = SolanaPubkey::try_from(SPL_STAKE_POOL_PROGRAM_ID)
        .map_err(|_| error!(VowError::StakeAccountMismatch))?;
    require!(
        ctx.accounts.stake_pool_program.key() == stake_pool_program_id,
        VowError::StakeAccountMismatch
    );

    // Verify and read pool account data.
    // X1 StakePool layout (Borsh, no discriminator):
    //   0: version(1) 1: account_type(1) 2: manager(32) 34: staker(32) 66: stake_deposit_authority(32)
    //   98: bump(1) 99: validator_list(32) 131: reserve_stake(32) 163: pool_mint(32) 195: manager_fee(32)
    //   227: token_program_id(32) 259: total_lamports(8) 267: pool_token_supply(8)
    let pool_data = ctx.accounts.spl_pool.try_borrow_data()?;
    require!(pool_data.len() >= 275, VowError::InvalidStakeAccount);
    let reserve_stake_key = Pubkey::new_from_array(pool_data[131..163].try_into().unwrap());
    let manager_fee_key = Pubkey::new_from_array(pool_data[195..227].try_into().unwrap());
    let total_lamports = u64::from_le_bytes(pool_data[259..267].try_into().unwrap());
    let pool_token_supply = u64::from_le_bytes(pool_data[267..275].try_into().unwrap());
    drop(pool_data);

    require!(
        ctx.accounts.pool_reserve_stake.key() == reserve_stake_key,
        VowError::StakeAccountMismatch
    );
    require!(
        ctx.accounts.pool_manager_fee_account.key() == manager_fee_key,
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

    require!(pool_token_supply > 0 && total_lamports > 0, VowError::EmptyReserve);

    // Ceiling division: burn enough tokens to receive at least lamports_needed
    let tokens_to_burn = (lamports_needed as u128)
        .checked_mul(pool_token_supply as u128)
        .ok_or(VowError::MathOverflow)?
        .checked_add((total_lamports as u128).saturating_sub(1))
        .ok_or(VowError::MathOverflow)?
        .checked_div(total_lamports as u128)
        .ok_or(VowError::MathOverflow)? as u64;

    let tokens_to_burn = tokens_to_burn.min(ctx.accounts.reserve_pool_tokens.amount);
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
            AccountMeta::new(ctx.accounts.reserve.key(), false),         // lamports_to
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
