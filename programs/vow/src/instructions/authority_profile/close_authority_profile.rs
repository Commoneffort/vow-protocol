use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::AuthorityProfile;

#[derive(Accounts)]
pub struct CloseAuthorityProfile<'info> {
    #[account(
        mut,
        seeds = [b"authority_profile", wallet.key().as_ref(), authority_profile.profile_id.as_ref()],
        bump = authority_profile.bump,
        has_one = wallet @ VowError::Unauthorized,
        close = wallet,
    )]
    pub authority_profile: Account<'info, AuthorityProfile>,

    #[account(mut)]
    pub wallet: Signer<'info>,
}

pub fn handler(_ctx: Context<CloseAuthorityProfile>) -> Result<()> {
    Ok(()) // close = wallet in constraint handles rent reclaim
}
