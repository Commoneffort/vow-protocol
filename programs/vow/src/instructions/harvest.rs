use anchor_lang::prelude::*;
use crate::constants::SHARE_PRECISION;
use crate::errors::VowError;
use crate::events::{Harvested, VowMatured};
use crate::state::{VowState, ProtocolConfig, YieldMode};

/// Internal helper: settle VOW's accrued gain against the current share price.
/// Must be called before any mutation to yield_mode, yield_balance, or shares.
pub fn settle_idnft(idnft: &mut VowState, config: &ProtocolConfig) -> Result<()> {
    if idnft.last_share_price == config.current_share_price {
        return Ok(());
    }

    let current_value = (idnft.shares as u128)
        .checked_mul(config.current_share_price)
        .ok_or(VowError::MathOverflow)?
        .checked_div(SHARE_PRECISION)
        .unwrap_or(0);

    let last_value = (idnft.shares as u128)
        .checked_mul(idnft.last_share_price)
        .ok_or(VowError::MathOverflow)?
        .checked_div(SHARE_PRECISION)
        .unwrap_or(0);

    // H-1 fix: compute delta in i128 then clamp to i64 range before storing.
    // Prevents silent wrap on high-TVL positions where position value > i64::MAX.
    let delta = (current_value as i128 - last_value as i128)
        .clamp(i64::MIN as i128, i64::MAX as i128) as i64;

    idnft.accrued_gain = idnft.accrued_gain.saturating_add(delta);
    idnft.last_share_price = config.current_share_price;

    Ok(())
}

// ---- Harvest instruction ----

#[derive(Accounts)]
pub struct Harvest<'info> {
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
}

pub fn handler(ctx: Context<Harvest>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let idnft = &mut ctx.accounts.vow_state;

    let clock = Clock::get()?;
    if !idnft.matured && clock.unix_timestamp >= idnft.unlock_at {
        idnft.matured = true;
        emit!(VowMatured { asset_id: idnft.asset_id, owner: idnft.owner, class: idnft.class });
    }

    settle_idnft(idnft, config)?;

    let gain = idnft.accrued_gain;

    let (yield_credited, shares_burned) = match idnft.yield_mode {
        YieldMode::Compound => {
            idnft.total_harvested = idnft.total_harvested.saturating_add(gain.max(0) as u64);
            idnft.accrued_gain = 0;
            (0u64, 0u128)
        }

        YieldMode::Treasury => {
            if gain <= 0 {
                idnft.accrued_gain = 0;
                (0u64, 0u128)
            } else {
                let treasury_amount = gain as u64;
                let shares_to_burn = (treasury_amount as u128)
                    .checked_mul(SHARE_PRECISION)
                    .ok_or(VowError::MathOverflow)?
                    .checked_div(config.current_share_price)
                    .unwrap_or(0);

                require!(idnft.shares >= shares_to_burn, VowError::SharesUnderflow);
                idnft.shares -= shares_to_burn;
                config.total_shares = config.total_shares.saturating_sub(shares_to_burn);

                idnft.yield_balance = idnft.yield_balance.saturating_add(treasury_amount);
                config.total_yield_claims = config.total_yield_claims.saturating_add(treasury_amount);
                idnft.total_harvested = idnft.total_harvested.saturating_add(treasury_amount);
                idnft.accrued_gain = 0;
                (treasury_amount, shares_to_burn)
            }
        }

        YieldMode::Hybrid => {
            if gain <= 0 {
                idnft.accrued_gain = 0;
                (0u64, 0u128)
            } else {
                let treasury_amount = (gain as u64) / 2;
                // L-3 fix: carry the 1-lamport remainder to the next harvest instead of discarding it
                let remainder = (gain as u64) % 2;

                let shares_to_burn = (treasury_amount as u128)
                    .checked_mul(SHARE_PRECISION)
                    .ok_or(VowError::MathOverflow)?
                    .checked_div(config.current_share_price)
                    .unwrap_or(0);

                require!(idnft.shares >= shares_to_burn, VowError::SharesUnderflow);
                idnft.shares -= shares_to_burn;
                config.total_shares = config.total_shares.saturating_sub(shares_to_burn);

                idnft.yield_balance = idnft.yield_balance.saturating_add(treasury_amount);
                config.total_yield_claims = config.total_yield_claims.saturating_add(treasury_amount);
                idnft.total_harvested = idnft.total_harvested.saturating_add(gain as u64);
                // Carry remainder forward so it is credited on the next harvest
                idnft.accrued_gain = remainder as i64;
                (treasury_amount, shares_to_burn)
            }
        }
    };

    emit!(Harvested {
        asset_id: idnft.asset_id,
        owner: idnft.owner,
        gain,
        yield_credited,
        shares_burned,
    });

    Ok(())
}
