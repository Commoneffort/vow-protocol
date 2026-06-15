use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::events::YieldModeUpdated;
use crate::state::{VowState, ProtocolConfig, YieldMode};
use crate::instructions::harvest::settle_idnft;

#[derive(Accounts)]
pub struct UpdateYieldMode<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"vow", vow_state.asset_id.as_ref()],
        bump = vow_state.bump,
        has_one = owner @ VowError::InvalidOwner,
    )]
    pub vow_state: Account<'info, VowState>,

    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateYieldMode>, new_mode: YieldMode) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let idnft = &mut ctx.accounts.vow_state;
    require!(idnft.active_stake, VowError::IdentityInactive);
    require!(idnft.yield_mode != new_mode, VowError::YieldModeUnchanged);

    settle_idnft(idnft, config)?;

    let old_mode = idnft.yield_mode.to_u8();
    idnft.yield_mode = new_mode;

    emit!(YieldModeUpdated {
        asset_id: idnft.asset_id,
        old_mode,
        new_mode: new_mode.to_u8(),
    });

    Ok(())
}
