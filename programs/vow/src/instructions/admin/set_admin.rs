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

    /// The new admin must co-sign, proving the key exists and is controlled —
    /// prevents handing admin to a typo'd or unowned address.
    pub new_admin: Signer<'info>,
}

pub fn handler(ctx: Context<SetAdmin>) -> Result<()> {
    require_keys_neq!(ctx.accounts.new_admin.key(), Pubkey::default(), VowError::Unauthorized);
    ctx.accounts.config.admin = ctx.accounts.new_admin.key();
    Ok(())
}
