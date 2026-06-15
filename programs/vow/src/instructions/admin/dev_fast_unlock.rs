use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::{ProtocolConfig, VowState};

#[derive(Accounts)]
pub struct DevFastUnlock<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VowError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"vow", vow_state.asset_id.as_ref()],
        bump = vow_state.bump,
    )]
    pub vow_state: Account<'info, VowState>,

    pub admin: Signer<'info>,
}

/// Testnet-only: admin forces an identity's lock period to expire immediately.
/// Sets unlock_at = 1 so any real timestamp passes the complete_unstake check.
/// Blocked when a real SPL stake pool is configured (i.e., on mainnet).
pub fn handler(ctx: Context<DevFastUnlock>) -> Result<()> {
    require!(
        ctx.accounts.config.spl_stake_pool == Pubkey::default(),
        VowError::Unauthorized
    );
    ctx.accounts.vow_state.unlock_at = 1;
    Ok(())
}
