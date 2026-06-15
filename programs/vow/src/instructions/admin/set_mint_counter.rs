use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::ProtocolConfig;

/// Admin-only migration helper: advances total_minted to skip past VowState
/// accounts that exist from before a config reinitialization. Only allows
/// increasing the counter (never decreasing) to prevent skipping live accounts.
#[derive(Accounts)]
pub struct SetMintCounter<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VowError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<SetMintCounter>, new_counter: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    require!(new_counter > config.total_minted, VowError::InvalidStakeAccount);
    config.total_minted = new_counter;
    Ok(())
}
