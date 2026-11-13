use anchor_lang::prelude::*;
use crate::state::{OwnerIndex, VowState};

/// Creates `["owner_index", owner]` for an identity minted before one-per-wallet was
/// enforced. Permissionless and idempotent-by-construction (`init` fails if the
/// wallet already has an index), so it can only ever block further mints.
///
/// Wallets that already hold several legacy identities keep them (grandfathered);
/// the index records whichever one is backfilled as canonical — the backfill script
/// picks the lowest-nonce (oldest) identity.
#[derive(Accounts)]
pub struct BackfillOwnerIndex<'info> {
    #[account(
        seeds = [b"vow", vow_state.asset_id.as_ref()],
        bump = vow_state.bump,
    )]
    pub vow_state: Account<'info, VowState>,

    #[account(
        init,
        payer = payer,
        space = OwnerIndex::LEN,
        seeds = [b"owner_index", vow_state.owner.as_ref()],
        bump,
    )]
    pub owner_index: Account<'info, OwnerIndex>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BackfillOwnerIndex>) -> Result<()> {
    let index = &mut ctx.accounts.owner_index;
    index.owner = ctx.accounts.vow_state.owner;
    index.vow_state = ctx.accounts.vow_state.key();
    index.bump = ctx.bumps.owner_index;
    Ok(())
}
