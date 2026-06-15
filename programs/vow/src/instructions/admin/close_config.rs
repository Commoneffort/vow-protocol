use anchor_lang::prelude::*;
use crate::errors::VowError;

/// One-time migration helper — closes a stale ProtocolConfig account so it can
/// be re-initialized with a new layout after a program upgrade.
/// Reads the admin pubkey directly from account bytes (offset 8) so it works
/// even when the full account layout has changed.
#[derive(Accounts)]
pub struct CloseProtocolConfig<'info> {
    /// CHECK: intentionally UncheckedAccount — bypasses size check so we can
    /// close a config account whose layout has changed across a program upgrade.
    #[account(mut, seeds = [b"config"], bump)]
    pub config: UncheckedAccount<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<CloseProtocolConfig>) -> Result<()> {
    let data = ctx.accounts.config.try_borrow_data()?;
    require!(data.len() >= 40, VowError::InvalidStakeAccount);

    // Admin pubkey is at offset 8 (after 8-byte discriminator) in both old and new layouts
    let stored_admin = Pubkey::try_from(&data[8..40]).map_err(|_| VowError::Unauthorized)?;
    drop(data);

    require_keys_eq!(stored_admin, ctx.accounts.admin.key(), VowError::Unauthorized);

    let lamports = ctx.accounts.config.lamports();
    **ctx.accounts.config.try_borrow_mut_lamports()? -= lamports;
    **ctx.accounts.admin.try_borrow_mut_lamports()? += lamports;

    let mut data = ctx.accounts.config.try_borrow_mut_data()?;
    data.fill(0);

    Ok(())
}
