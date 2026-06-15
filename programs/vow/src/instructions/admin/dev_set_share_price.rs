use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::ProtocolConfig;

#[derive(Accounts)]
pub struct DevSetSharePrice<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VowError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub admin: Signer<'info>,
}

/// Testnet-only: admin sets share price directly to simulate yield accumulation.
/// Blocked when a real SPL stake pool is configured (i.e., on mainnet).
pub fn handler(ctx: Context<DevSetSharePrice>, new_price: u128) -> Result<()> {
    require!(
        ctx.accounts.config.spl_stake_pool == Pubkey::default(),
        VowError::Unauthorized
    );
    require!(new_price > 0, VowError::SharePriceOverflow);
    ctx.accounts.config.current_share_price = new_price;
    Ok(())
}
