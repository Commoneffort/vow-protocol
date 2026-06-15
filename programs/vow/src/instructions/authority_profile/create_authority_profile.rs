use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::AuthorityProfile;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AuthorityProfileParams {
    pub default_daily_limit: u64,
    pub default_lifetime_limit: u64,
    pub default_expiry_days: u32,
    pub default_allowed_program_ids: Vec<Pubkey>,
    pub metadata_uri: Vec<u8>,
}

#[derive(Accounts)]
#[instruction(profile_id: [u8; 8])]
pub struct CreateAuthorityProfile<'info> {
    #[account(
        init,
        payer = wallet,
        space = AuthorityProfile::LEN,
        seeds = [b"authority_profile", wallet.key().as_ref(), profile_id.as_ref()],
        bump,
    )]
    pub authority_profile: Account<'info, AuthorityProfile>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateAuthorityProfile>,
    profile_id: [u8; 8],
    params: AuthorityProfileParams,
) -> Result<()> {
    require!(
        params.default_allowed_program_ids.len() <= 8,
        VowError::TooManyProgramIds
    );
    require!(
        params.metadata_uri.len() <= 128,
        VowError::TooManyProgramIds // reuse; metadata too long
    );

    let clock = Clock::get()?;
    let profile = &mut ctx.accounts.authority_profile;
    profile.wallet = ctx.accounts.wallet.key();
    profile.profile_id = profile_id;
    profile.default_daily_limit = params.default_daily_limit;
    profile.default_lifetime_limit = params.default_lifetime_limit;
    profile.default_expiry_days = params.default_expiry_days;
    profile.program_count = params.default_allowed_program_ids.len() as u8;
    profile.created_at = clock.unix_timestamp;
    profile.bump = ctx.bumps.authority_profile;

    for (i, pid) in params.default_allowed_program_ids.iter().enumerate() {
        profile.default_allowed_program_ids[i] = *pid;
    }
    for i in params.default_allowed_program_ids.len()..8 {
        profile.default_allowed_program_ids[i] = Pubkey::default();
    }

    let uri_len = params.metadata_uri.len().min(128);
    profile.uri_len = uri_len as u8;
    profile.metadata_uri[..uri_len].copy_from_slice(&params.metadata_uri[..uri_len]);

    Ok(())
}
