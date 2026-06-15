use anchor_lang::prelude::*;
use crate::events::{AppRegistered, AppBlocked};
use crate::errors::VowError;
use crate::state::{AppRegistry, ProtocolConfig};

#[derive(Accounts)]
#[instruction(program_id: Pubkey)]
pub struct RegisterApp<'info> {
    #[account(
        init,
        payer = payer,
        space = AppRegistry::LEN,
        seeds = [b"app", program_id.as_ref()],
        bump,
    )]
    pub app_registry: Account<'info, AppRegistry>,

    // Permissionless — anyone can register
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register(ctx: Context<RegisterApp>, program_id: Pubkey) -> Result<()> {
    let clock = Clock::get()?;
    let reg = &mut ctx.accounts.app_registry;
    reg.program_id = program_id;
    reg.verified = false;
    reg.blocked = false;
    reg.registered_at = clock.unix_timestamp;
    reg.bump = ctx.bumps.app_registry;

    emit!(AppRegistered { program_id });
    Ok(())
}

// ---- Admin-only: verify and block ----

#[derive(Accounts)]
pub struct AdminAppAction<'info> {
    // M-3 fix: seed constraint binds app_registry to its canonical program_id PDA,
    // preventing the admin from accidentally verifying or blocking the wrong registry.
    #[account(
        mut,
        seeds = [b"app", app_registry.program_id.as_ref()],
        bump = app_registry.bump,
    )]
    pub app_registry: Account<'info, AppRegistry>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VowError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub admin: Signer<'info>,
}

pub fn verify(ctx: Context<AdminAppAction>) -> Result<()> {
    ctx.accounts.app_registry.verified = true;
    Ok(())
}

pub fn block(ctx: Context<AdminAppAction>) -> Result<()> {
    ctx.accounts.app_registry.blocked = true;
    emit!(AppBlocked { program_id: ctx.accounts.app_registry.program_id });
    Ok(())
}
