/// Initializes the SPL concurrent Merkle tree and registers its authority.
/// Called once after protocol initialization.
/// The Merkle tree account must be pre-allocated externally (it's a large account).

use anchor_lang::prelude::*;
use crate::errors::VowError;
use crate::state::ProtocolConfig;

#[derive(Accounts)]
pub struct InitializeTree<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VowError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    /// The pre-allocated Merkle tree account (created externally with rent)
    /// CHECK: validated by address = config.merkle_tree
    #[account(mut, address = config.merkle_tree)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// Tree authority PDA — this program's PDA is the sole tree authority
    /// CHECK: PDA validated by seeds
    #[account(
        init,
        payer = admin,
        space = 0,
        seeds = [b"tree_authority", merkle_tree.key().as_ref()],
        bump,
    )]
    pub tree_authority: UncheckedAccount<'info>,

    /// CHECK: SPL account compression program
    #[account(address = spl_account_compression::ID)]
    pub compression_program: UncheckedAccount<'info>,

    /// CHECK: noop program
    pub log_wrapper: UncheckedAccount<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeTree>,
    max_depth: u32,
    max_buffer_size: u32,
) -> Result<()> {
    let tree_key = ctx.accounts.merkle_tree.key();
    let tree_auth_bump = ctx.bumps.tree_authority;
    let auth_seeds: &[&[u8]] = &[b"tree_authority", tree_key.as_ref(), &[tree_auth_bump]];

    // Initialize the Merkle tree via spl-account-compression CPI
    let cpi_accounts = spl_account_compression::cpi::accounts::Initialize {
        merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
        authority: ctx.accounts.tree_authority.to_account_info(),
        noop: ctx.accounts.log_wrapper.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.compression_program.to_account_info(),
        cpi_accounts,
        &[auth_seeds],
    );
    spl_account_compression::cpi::init_empty_merkle_tree(cpi_ctx, max_depth, max_buffer_size)?;

    Ok(())
}
