use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::events::SessionRevoked;
use crate::state::{VowState, SessionAccount};

#[derive(Accounts)]
pub struct RevokeSession<'info> {
    #[account(
        seeds = [b"vow", vow_state.asset_id.as_ref()],
        bump = vow_state.bump,
        has_one = owner @ VowError::InvalidOwner,
    )]
    pub vow_state: Account<'info, VowState>,

    #[account(
        mut,
        seeds = [b"session", vow_state.key().as_ref(), &session_account.session_index.to_le_bytes()],
        bump = session_account.bump,
        has_one = vow_state @ VowError::SessionInactive,
    )]
    pub session_account: Account<'info, SessionAccount>,

    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<RevokeSession>) -> Result<()> {
    let session_key = ctx.accounts.session_account.session_key;
    ctx.accounts.session_account.active = false;

    emit!(SessionRevoked {
        vow_state: ctx.accounts.vow_state.key(),
        session_key,
    });

    Ok(())
}
