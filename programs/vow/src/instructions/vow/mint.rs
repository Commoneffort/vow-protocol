use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::VowError;
use crate::events::VowMinted;
use crate::state::{ProtocolConfig, VowState, YieldMode, class_for_stake, lock_duration};

#[derive(Accounts)]
pub struct MintVow<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    /// asset_id PDA — derived from [b"vow_asset", nonce.to_le_bytes()]
    /// CHECK: validated in body against config.total_minted
    #[account(
        seeds = [b"vow_asset", &config.total_minted.to_le_bytes()],
        bump,
    )]
    pub asset_id_account: UncheckedAccount<'info>,

    #[account(
        init,
        payer = owner,
        space = VowState::LEN,
        seeds = [b"vow", asset_id_account.key().as_ref()],
        bump,
    )]
    pub vow_state: Account<'info, VowState>,

    /// Reserve PDA — receives the staked lamports
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

pub fn handler(
    ctx: Context<MintVow>,
    stake_lamports: u64,
    yield_mode: YieldMode,
) -> Result<()> {
    let class = class_for_stake(stake_lamports)?;

    // Block minting if a real pool is configured but the share price has never been
    // read from it. last_pool_lamports stays 0 until the first update_share_price
    // succeeds, so this catches the window between initialize and the first sync.
    if ctx.accounts.config.spl_stake_pool != Pubkey::default() {
        require!(
            ctx.accounts.config.last_pool_lamports > 0,
            VowError::SharePriceNotSynced
        );
    }

    let clock = Clock::get()?;
    let asset_id = ctx.accounts.asset_id_account.key();

    // Deposit principal into reserve
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.reserve.to_account_info(),
            },
        ),
        stake_lamports,
    )?;

    let config_ref = &ctx.accounts.config;
    // Always use the current share price — dividing by SHARE_PRECISION when price == SHARE_PRECISION
    // gives shares == stake_lamports (the initial 1:1 case). Using total_shares==0 as a special
    // case would give the first minter inflated shares if the price already appreciated from
    // a previous pool cycle where all positions were eventually unstaked.
    let shares = (stake_lamports as u128)
        .checked_mul(SHARE_PRECISION)
        .ok_or(VowError::MathOverflow)?
        .checked_div(config_ref.current_share_price)
        .ok_or(VowError::MathOverflow)?;

    let unlock_at = clock.unix_timestamp + lock_duration(class);
    let nonce = ctx.accounts.config.total_minted;

    let idnft = &mut ctx.accounts.vow_state;
    idnft.asset_id = asset_id;
    idnft.owner = ctx.accounts.owner.key();
    idnft.class = class;
    idnft.principal_lamports = stake_lamports;
    idnft.shares = shares;
    idnft.last_share_price = ctx.accounts.config.current_share_price;
    idnft.accrued_gain = 0;
    idnft.yield_mode = yield_mode;
    idnft.yield_balance = 0;
    idnft.total_harvested = 0;
    idnft.created_at = clock.unix_timestamp;
    idnft.unlock_at = unlock_at;
    idnft.matured = false;
    idnft.sessions_invalidated_at = 0;
    idnft.active_stake = true;
    idnft.session_nonce = 0;
    idnft.nonce = nonce;
    idnft.bump = ctx.bumps.vow_state;

    idnft.first_staked_at = clock.unix_timestamp;
    idnft.current_stake_started_at = clock.unix_timestamp;
    idnft.total_commitments = 1;
    idnft.total_fulfilled = 0;
    idnft.cumulative_stake_days = 0;
    idnft.highest_class_ever = class;

    let config = &mut ctx.accounts.config;
    config.total_shares = config.total_shares
        .checked_add(shares)
        .ok_or(VowError::MathOverflow)?;
    config.total_minted += 1;

    emit!(VowMinted {
        asset_id,
        owner: idnft.owner,
        class,
        stake_lamports,
        shares,
        unlock_at,
    });

    Ok(())
}
