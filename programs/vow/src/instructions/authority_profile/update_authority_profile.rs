use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::AuthorityProfile;
use super::create_authority_profile::AuthorityProfileParams;

#[derive(Accounts)]
pub struct UpdateAuthorityProfile<'info> {
    #[account(
        mut,
        seeds = [b"authority_profile", wallet.key().as_ref(), authority_profile.profile_id.as_ref()],
        bump = authority_profile.bump,
        has_one = wallet @ VowError::Unauthorized,
    )]
    pub authority_profile: Account<'info, AuthorityProfile>,

    pub wallet: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateAuthorityProfile>, params: AuthorityProfileParams) -> Result<()> {
    require!(
        params.default_allowed_program_ids.len() <= 8,
        VowError::TooManyProgramIds
    );

    let profile = &mut ctx.accounts.authority_profile;
    profile.default_daily_limit = params.default_daily_limit;
    profile.default_lifetime_limit = params.default_lifetime_limit;
    profile.default_expiry_days = params.default_expiry_days;
    profile.program_count = params.default_allowed_program_ids.len() as u8;

    for (i, pid) in params.default_allowed_program_ids.iter().enumerate() {
        profile.default_allowed_program_ids[i] = *pid;
    }
    for i in params.default_allowed_program_ids.len()..8 {
        profile.default_allowed_program_ids[i] = Pubkey::default();
    }

    if !params.metadata_uri.is_empty() {
        let uri_len = params.metadata_uri.len().min(128);
        profile.uri_len = uri_len as u8;
        profile.metadata_uri[..uri_len].copy_from_slice(&params.metadata_uri[..uri_len]);
    }

    Ok(())
}
