use anchor_lang::prelude::*;

pub mod compression;
pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ");

#[program]
pub mod vow {
    use super::*;

    // ---- Admin ----

    pub fn initialize(
        ctx: Context<Initialize>,
        spl_stake_pool: Pubkey,
        spl_pool_mint: Pubkey,
    ) -> Result<()> {
        instructions::admin::initialize::handler(ctx, spl_stake_pool, spl_pool_mint)
    }

    pub fn set_admin(ctx: Context<SetAdmin>) -> Result<()> {
        instructions::admin::set_admin::handler(ctx)
    }

    pub fn close_protocol_config(ctx: Context<CloseProtocolConfig>) -> Result<()> {
        instructions::admin::close_config::handler(ctx)
    }

    pub fn set_mint_counter(ctx: Context<SetMintCounter>, new_counter: u64) -> Result<()> {
        instructions::admin::set_mint_counter::handler(ctx, new_counter)
    }

    pub fn dev_set_share_price(ctx: Context<DevSetSharePrice>, new_price: u128) -> Result<()> {
        instructions::admin::dev_set_share_price::handler(ctx, new_price)
    }

    pub fn dev_fast_unlock(ctx: Context<DevFastUnlock>) -> Result<()> {
        instructions::admin::dev_fast_unlock::handler(ctx)
    }

    pub fn register_app(ctx: Context<RegisterApp>, program_id: Pubkey) -> Result<()> {
        instructions::admin::register_app::register(ctx, program_id)
    }

    pub fn verify_app(ctx: Context<AdminAppAction>) -> Result<()> {
        instructions::admin::register_app::verify(ctx)
    }

    pub fn block_app(ctx: Context<AdminAppAction>) -> Result<()> {
        instructions::admin::register_app::block(ctx)
    }

    // ---- Share Price + Pool Management (permissionless cranks) ----

    pub fn update_share_price(ctx: Context<UpdateSharePrice>) -> Result<()> {
        instructions::pool::update_share_price::handler(ctx)
    }

    pub fn flush_reserve_to_pool(ctx: Context<FlushReserveToPool>) -> Result<()> {
        instructions::pool::flush_reserve_to_pool::handler(ctx)
    }

    pub fn withdraw_from_pool(ctx: Context<WithdrawFromPool>) -> Result<()> {
        instructions::pool::withdraw_from_pool::handler(ctx)
    }

    // ---- VOW Core ----

    pub fn add_stake(ctx: Context<AddStake>, lamports_to_add: u64) -> Result<()> {
        instructions::vow::add_stake::handler(ctx, lamports_to_add)
    }

    pub fn mint_vow(
        ctx: Context<MintVow>,
        stake_lamports: u64,
        yield_mode: state::YieldMode,
    ) -> Result<()> {
        instructions::vow::mint::handler(ctx, stake_lamports, yield_mode)
    }

    pub fn update_yield_mode(
        ctx: Context<UpdateYieldMode>,
        new_mode: state::YieldMode,
    ) -> Result<()> {
        instructions::vow::update_yield_mode::handler(ctx, new_mode)
    }

    pub fn begin_unstake(ctx: Context<BeginUnstake>) -> Result<()> {
        instructions::vow::begin_unstake::handler(ctx)
    }

    pub fn complete_unstake(ctx: Context<CompleteUnstake>) -> Result<()> {
        instructions::vow::complete_unstake::handler(ctx)
    }

    pub fn activate_stake(
        ctx: Context<ActivateStake>,
        stake_lamports: u64,
        yield_mode: state::YieldMode,
    ) -> Result<()> {
        instructions::vow::activate_stake::handler(ctx, stake_lamports, yield_mode)
    }

    // ---- Harvest ----

    pub fn harvest(ctx: Context<Harvest>) -> Result<()> {
        instructions::harvest::handler(ctx)
    }

    // ---- Sessions ----

    pub fn create_session(
        ctx: Context<CreateSession>,
        session_key: Pubkey,
        allowed_program_ids: Vec<Pubkey>,
        params: SessionParams,
        session_index: u32,
    ) -> Result<()> {
        instructions::session::create_session::handler(ctx, session_key, allowed_program_ids, params, session_index)
    }

    pub fn revoke_session(ctx: Context<RevokeSession>) -> Result<()> {
        instructions::session::revoke_session::handler(ctx)
    }

    pub fn close_session(ctx: Context<CloseSession>) -> Result<()> {
        instructions::session::close_session::handler(ctx)
    }

    // ---- Treasury / Yield ----

    pub fn deposit_yield_balance(ctx: Context<DepositYieldBalance>, amount: u64) -> Result<()> {
        instructions::treasury::deposit_yield_balance::handler(ctx, amount)
    }

    pub fn yield_spend(ctx: Context<YieldSpend>, amount: u64) -> Result<()> {
        instructions::treasury::yield_spend::handler(ctx, amount)
    }

    pub fn withdraw_yield(ctx: Context<WithdrawYield>, amount: Option<u64>) -> Result<()> {
        instructions::treasury::withdraw_yield::handler(ctx, amount)
    }

    // ---- Authority Profiles ----

    pub fn create_authority_profile(
        ctx: Context<CreateAuthorityProfile>,
        profile_id: [u8; 8],
        params: AuthorityProfileParams,
    ) -> Result<()> {
        instructions::authority_profile::create_authority_profile::handler(ctx, profile_id, params)
    }

    pub fn update_authority_profile(
        ctx: Context<UpdateAuthorityProfile>,
        params: AuthorityProfileParams,
    ) -> Result<()> {
        instructions::authority_profile::update_authority_profile::handler(ctx, params)
    }

    pub fn close_authority_profile(ctx: Context<CloseAuthorityProfile>) -> Result<()> {
        instructions::authority_profile::close_authority_profile::handler(ctx)
    }

    // ---- Commitment Record ----

    pub fn record_commitment(ctx: Context<RecordCommitment>) -> Result<()> {
        instructions::commitment::record_commitment::handler(ctx)
    }

    pub fn record_fulfillment(ctx: Context<RecordFulfillment>) -> Result<()> {
        instructions::commitment::record_fulfillment::handler(ctx)
    }
}
