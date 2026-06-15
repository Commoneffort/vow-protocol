use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::ProtocolConfig;

#[derive(Accounts)]
pub struct SetAdmin<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VowError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub admin: Signer<'info>,

    /// CHECK: new admin pubkey — just a public key, no account validation needed
    pub new_admin: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<SetAdmin>) -> Result<()> {
    require_keys_neq!(ctx.accounts.new_admin.key(), Pubkey::default(), VowError::Unauthorized);
    ctx.accounts.config.admin = ctx.accounts.new_admin.key();
    Ok(())
}
