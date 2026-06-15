use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::{VowState, SessionAccount};

#[derive(Accounts)]
pub struct CloseSession<'info> {
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
        close = owner,
    )]
    pub session_account: Account<'info, SessionAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<CloseSession>) -> Result<()> {
    let session = &ctx.accounts.session_account;
    let idnft = &ctx.accounts.vow_state;
    let clock = Clock::get()?;

    // Allow close if: expired, inactive, identity dormant, or sessions invalidated by unstake/activate
    // expiry_ts == 0 means "no expiry" — do not treat as expired
    let expired = session.expiry_ts > 0 && clock.unix_timestamp >= session.expiry_ts;
    let inactive = !session.active;
    let invalidated = session.start_ts <= idnft.sessions_invalidated_at;
    let identity_unstaked = !idnft.active_stake;

    require!(
        expired || inactive || invalidated || identity_unstaked,
        VowError::SessionInactive
    );

    Ok(())
}
