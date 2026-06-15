use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::events::SessionCreated;
use crate::state::{AuthorityProfile, VowState, ProtocolConfig, SessionAccount};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SessionParams {
    pub expiry_ts: i64,
    pub daily_limit: u64,
    pub lifetime_limit: u64,
    pub velocity_limit: u32,
}

/// session_index is placed last so the #[instruction] derivation only needs
/// to list session_key (used nowhere in seeds now, just stored in the account).
/// The PDA uses session_index so wallets can recover all sessions deterministically.
#[derive(Accounts)]
#[instruction(session_key: Pubkey, allowed_program_ids: Vec<Pubkey>, params: SessionParams, session_index: u32)]
pub struct CreateSession<'info> {
    #[account(
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

    #[account(
        init,
        payer = owner,
        space = SessionAccount::LEN,
        seeds = [b"session", vow_state.key().as_ref(), &session_index.to_le_bytes()],
        bump,
    )]
    pub session_account: Account<'info, SessionAccount>,

    /// Optional authority profile to inherit defaults from.
    pub authority_profile: Option<Account<'info, AuthorityProfile>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateSession>,
    session_key: Pubkey,
    allowed_program_ids: Vec<Pubkey>,
    params: SessionParams,
    session_index: u32,
) -> Result<()> {
    require!(allowed_program_ids.len() <= 8, VowError::TooManyProgramIds);
    // L-2: reject zero-key session — default pubkey is not a valid session signer
    require!(session_key != Pubkey::default(), VowError::SessionInactive);

    let vow = &ctx.accounts.vow_state;
    require!(vow.active_stake, VowError::IdentityInactive);

    // Read nonce before mutably borrowing vow_state below
    let creation_nonce = vow.session_nonce;
    let vow_key = vow.key();

    let clock = Clock::get()?;
    let session = &mut ctx.accounts.session_account;

    let (daily_limit, lifetime_limit, expiry_ts, velocity_limit) =
        if let Some(profile) = &ctx.accounts.authority_profile {
            require_keys_eq!(profile.wallet, ctx.accounts.owner.key(), VowError::Unauthorized);
            let expiry = if params.expiry_ts == 0 {
                clock.unix_timestamp + (profile.default_expiry_days as i64 * 86_400)
            } else { params.expiry_ts };
            let daily    = if params.daily_limit == 0    { profile.default_daily_limit    } else { params.daily_limit };
            let lifetime = if params.lifetime_limit == 0 { profile.default_lifetime_limit } else { params.lifetime_limit };
            let velocity = if params.velocity_limit == 0 { 0 } else { params.velocity_limit };
            (daily, lifetime, expiry, velocity)
        } else {
            (params.daily_limit, params.lifetime_limit, params.expiry_ts, params.velocity_limit)
        };

    session.vow_state       = vow_key;
    session.session_key     = session_key;
    session.session_index   = session_index;
    session.creation_nonce  = creation_nonce;
    session.program_count   = allowed_program_ids.len() as u8;
    session.start_ts        = clock.unix_timestamp;
    session.expiry_ts       = expiry_ts;
    session.daily_limit     = daily_limit;
    session.lifetime_limit  = lifetime_limit;
    session.velocity_limit  = velocity_limit;
    session.spent_today     = 0;
    session.spent_total     = 0;
    session.tx_count_today  = 0;
    session.last_reset_day  = clock.unix_timestamp / 86_400;
    session.active          = true;
    session.bump            = ctx.bumps.session_account;

    for (i, pid) in allowed_program_ids.iter().enumerate() {
        session.allowed_program_ids[i] = *pid;
    }
    for i in allowed_program_ids.len()..8 {
        session.allowed_program_ids[i] = Pubkey::default();
    }

    // Increment nonce so the next session in any slot derives a different keypair
    ctx.accounts.vow_state.session_nonce = creation_nonce
        .checked_add(1)
        .ok_or(VowError::MathOverflow)?;

    emit!(SessionCreated {
        vow_state: vow_key,
        session_key,
        expiry_ts,
        creation_nonce,
    });

    Ok(())
}
