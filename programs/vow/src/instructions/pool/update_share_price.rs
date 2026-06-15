use anchor_lang::prelude::*;
use crate::constants::SHARE_PRECISION;
use crate::errors::VowError;
use crate::events::SharePriceUpdated;
use crate::state::ProtocolConfig;

/// Permissionless crank. Reads the X1 Foundation SPL stake pool account to
/// compute the current pXNT/XNT exchange rate and updates the protocol's
/// share price. No admin interaction needed — the pool's totalLamports and
/// poolTokenSupply are parsed directly from on-chain account data.
///
/// X1 StakePool layout (version:u8 at offset 0 shifts all fields +1 vs standard SPL):
///   offset 259: totalLamports  u64 LE
///   offset 267: poolTokenSupply u64 LE
#[derive(Accounts)]
pub struct UpdateSharePrice<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    /// The X1 Foundation SPL stake pool account.
    /// Address is verified against config.spl_stake_pool so the crank
    /// cannot pass an attacker-controlled account to manipulate the price.
    /// CHECK: verified against config.spl_stake_pool; data parsed at fixed offsets.
    #[account(
        address = config.spl_stake_pool @ VowError::StakeAccountMismatch,
    )]
    pub spl_pool: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<UpdateSharePrice>) -> Result<()> {
    // If SPL pool is not yet configured (testnet), skip — keep current price.
    if ctx.accounts.config.spl_stake_pool == Pubkey::default() {
        return Ok(());
    }

    let data = ctx.accounts.spl_pool.try_borrow_data()?;

    // X1 StakePool layout adds version:u8 at offset 0, shifting all fields by 1.
    // total_lamports at 259..267, pool_token_supply at 267..275.
    require!(data.len() >= 275, VowError::InvalidStakeAccount);

    let total_lamports = u64::from_le_bytes(data[259..267].try_into().unwrap());
    let pool_token_supply = u64::from_le_bytes(data[267..275].try_into().unwrap());

    let config = &mut ctx.accounts.config;
    let old_price = config.current_share_price;

    if pool_token_supply > 0 {
        // price = totalLamports * SHARE_PRECISION / poolTokenSupply
        // Allows price to decrease (slashing) as well as increase (rewards).
        // Floor at 1 so division is always safe.
        let new_price = (total_lamports as u128)
            .checked_mul(SHARE_PRECISION)
            .ok_or(VowError::SharePriceOverflow)?
            .checked_div(pool_token_supply as u128)
            .unwrap_or(1)
            .max(1);
        config.current_share_price = new_price;
    }

    config.last_pool_lamports = total_lamports;

    emit!(SharePriceUpdated {
        old_price,
        new_price: config.current_share_price,
        pool_lamports: total_lamports,
        total_shares: config.total_shares,
    });

    Ok(())
}
