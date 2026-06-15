use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::events::YieldSpent;
use crate::state::{AppRegistry, VowState, ProtocolConfig, SessionAccount};

#[derive(Accounts)]
pub struct YieldSpend<'info> {
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
    )]
    pub vow_state: Account<'info, VowState>,

    #[account(
        mut,
        seeds = [b"session", vow_state.key().as_ref(), &session_account.session_index.to_le_bytes()],
        bump = session_account.bump,
        has_one = vow_state @ VowError::SessionInactive,
    )]
    pub session_account: Account<'info, SessionAccount>,

    /// The calling application's program account — must be executable and in allowed_program_ids.
    /// CHECK: verified to be executable and in the session's allowed_program_ids list
    pub calling_program: UncheckedAccount<'info>,

    /// Optional: app registry entry for the calling program.
    /// C-1 fix: seeds enforced at instruction level — caller must pass the registry
    /// for `calling_program`, not a different program's.
    #[account(
        seeds = [b"app", calling_program.key().as_ref()],
        bump,
    )]
    pub app_registry: Option<Account<'info, AppRegistry>>,

    /// Reserve PDA — source of yield lamports
    /// CHECK: PDA validated by seeds + bump from config
    #[account(
        mut,
        seeds = [b"reserve"],
        bump = config.reserve_bump,
    )]
    pub reserve: UncheckedAccount<'info>,

    /// Destination for the yield payment
    /// CHECK: any account that can receive lamports
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    /// The ephemeral session key must sign this transaction
    pub session_signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<YieldSpend>, amount: u64) -> Result<()> {

    let clock = Clock::get()?;
    let idnft = &mut ctx.accounts.vow_state;
    let session = &mut ctx.accounts.session_account;
    let calling_program_id = ctx.accounts.calling_program.key();

    require_keys_eq!(
        ctx.accounts.session_signer.key(),
        session.session_key,
        VowError::SessionInactive
    );

    require!(session.active, VowError::SessionInactive);
    // expiry_ts == 0 means "no expiry"; only check when a deadline is set
    require!(
        session.expiry_ts == 0 || clock.unix_timestamp < session.expiry_ts,
        VowError::SessionExpired
    );
    // M-2 fix: use >= so sessions created in the same block as activate_stake are valid
    require!(
        session.start_ts >= idnft.sessions_invalidated_at,
        VowError::SessionInvalidated
    );
    // Defense in depth: stake must be active at spend time
    require!(idnft.active_stake, VowError::IdentityInactive);

    require!(
        ctx.accounts.calling_program.executable,
        VowError::ProgramNotAllowed
    );
    // program_count == 0 means "allow any program"; only enforce whitelist when populated
    if session.program_count > 0 {
        let allowed = &session.allowed_program_ids[..session.program_count as usize];
        require!(
            allowed.contains(&calling_program_id),
            VowError::ProgramNotAllowed
        );
    }

    // C-1 fix: app_registry seed constraint ensures the registry belongs to calling_program.
    if let Some(reg) = &ctx.accounts.app_registry {
        require!(!reg.blocked, VowError::AppBlocked);
    }

    session.reset_daily_if_needed(clock.unix_timestamp);

    if session.velocity_limit > 0 {
        require!(
            session.tx_count_today < session.velocity_limit,
            VowError::VelocityLimitExceeded
        );
    }
    if session.daily_limit > 0 {
        require!(
            session.spent_today.saturating_add(amount) <= session.daily_limit,
            VowError::DailyLimitExceeded
        );
    }
    if session.lifetime_limit > 0 {
        require!(
            session.spent_total.saturating_add(amount) <= session.lifetime_limit,
            VowError::LifetimeLimitExceeded
        );
    }

    require!(idnft.yield_balance >= amount, VowError::InsufficientYieldBalance);
    require!(ctx.accounts.reserve.lamports() >= amount, VowError::InsufficientYieldBalance);

    idnft.yield_balance -= amount;
    let config = &mut ctx.accounts.config;
    config.total_yield_claims = config.total_yield_claims.saturating_sub(amount);

    session.spent_today += amount;
    session.spent_total += amount;
    session.tx_count_today += 1;

    let reserve_bump = ctx.accounts.config.reserve_bump;
    let reserve_seeds: &[&[u8]] = &[b"reserve", &[reserve_bump]];

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.reserve.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
            },
            &[reserve_seeds],
        ),
        amount,
    )?;

    emit!(YieldSpent {
        asset_id: idnft.asset_id,
        session_key: session.session_key,
        program_id: calling_program_id,
        amount,
        destination: ctx.accounts.destination.key(),
    });

    Ok(())
}
