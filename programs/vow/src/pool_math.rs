//! Stake-pool parsing and the protocol's fair-share accounting.
//!
//! ## Accounting model (NAV)
//!
//! Every share is worth an equal slice of what the protocol can actually pay out:
//!
//! ```text
//! liabilities  L   = total_yield_claims + total_pending_unstake       (fixed SOL owed)
//! liquid SOL   S   = reserve.lamports − rent_exempt_min
//! pXNT value   P   = pxnt · pool_lamports / pool_supply · (1 − withdraw_fee)   (redeemable)
//!
//! if S ≥ L:  NAV = P + (S − L) · (1 − deposit_fee) · (1 − withdraw_fee)
//! else:      NAV = P − (L − S)          (the shortfall is met by redeeming pXNT)
//!
//! share_price = NAV / total_shares
//! ```
//!
//! Idle SOL is valued at what it will be worth after the pool round-trip, and new
//! stake buys shares at that same net value (see `net_entry_lamports`), so flushing,
//! withdrawing, depositing yield, spending yield and harvesting are all NAV-neutral.
//! Pool fees are paid once by the user who causes them; any surplus (e.g. payouts
//! served from idle SOL without a round-trip) accrues pro-rata to all shareholders.
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey as SolanaPubkey;

use crate::constants::{PPM, SHARE_PRECISION, X1_ATA_PROGRAM_ID};
use crate::errors::VowError;
use crate::state::ProtocolConfig;

pub struct PoolInfo {
    pub reserve_stake: Pubkey,
    pub pool_mint: Pubkey,
    pub manager_fee_account: Pubkey,
    pub total_lamports: u64,
    pub pool_token_supply: u64,
    pub last_update_epoch: u64,
    pub deposit_fee_ppm: u32,
    pub withdrawal_fee_ppm: u32,
    pub has_sol_deposit_authority: bool,
    pub has_sol_withdraw_authority: bool,
}

struct Reader<'a> {
    d: &'a [u8],
    o: usize,
}

impl<'a> Reader<'a> {
    fn take(&mut self, n: usize) -> Result<&'a [u8]> {
        let end = self.o.checked_add(n).ok_or(VowError::InvalidStakeAccount)?;
        require!(end <= self.d.len(), VowError::InvalidStakeAccount);
        let s = &self.d[self.o..end];
        self.o = end;
        Ok(s)
    }
    fn u8(&mut self) -> Result<u8> {
        Ok(self.take(1)?[0])
    }
    fn u64(&mut self) -> Result<u64> {
        Ok(u64::from_le_bytes(self.take(8)?.try_into().unwrap()))
    }
    fn pubkey(&mut self) -> Result<Pubkey> {
        Ok(Pubkey::new_from_array(self.take(32)?.try_into().unwrap()))
    }
    fn skip(&mut self, n: usize) -> Result<()> {
        self.take(n).map(|_| ())
    }
    fn opt_pubkey(&mut self) -> Result<Option<Pubkey>> {
        Ok(match self.u8()? {
            0 => None,
            1 => Some(self.pubkey()?),
            _ => return err!(VowError::InvalidStakeAccount),
        })
    }
    /// SPL `Fee { denominator: u64, numerator: u64 }` → ppm, rounded up.
    fn fee_ppm(&mut self) -> Result<u32> {
        let den = self.u64()? as u128;
        let num = self.u64()? as u128;
        if den == 0 || num == 0 {
            return Ok(0);
        }
        let ppm = (num * PPM + den - 1) / den;
        Ok(ppm.min(PPM - 1) as u32)
    }
    /// SPL `FutureEpoch<Fee>`: 0 = None, 1 = One(fee), 2 = Two(fee).
    fn future_fee_ppm(&mut self) -> Result<u32> {
        match self.u8()? {
            0 => Ok(0),
            1 | 2 => self.fee_ppm(),
            _ => err!(VowError::InvalidStakeAccount),
        }
    }
}

/// Parse the X1 Foundation SPL stake pool account (X1 layout: a 1-byte version
/// prefix shifts the standard SPL `StakePool` fields by +1).
pub fn parse_pool(data: &[u8]) -> Result<PoolInfo> {
    let mut r = Reader { d: data, o: 131 };
    let reserve_stake = r.pubkey()?; // 131
    let pool_mint = r.pubkey()?; // 163
    let manager_fee_account = r.pubkey()?; // 195
    r.skip(32)?; // 227 token_program_id
    let total_lamports = r.u64()?; // 259
    let pool_token_supply = r.u64()?; // 267
    let last_update_epoch = r.u64()?; // 275
    r.skip(48)?; // lockup
    r.skip(16)?; // epoch_fee
    r.future_fee_ppm()?; // next_epoch_fee
    r.opt_pubkey()?; // preferred_deposit_validator
    r.opt_pubkey()?; // preferred_withdraw_validator
    r.skip(16)?; // stake_deposit_fee
    r.skip(16)?; // stake_withdrawal_fee
    r.future_fee_ppm()?; // next_stake_withdrawal_fee
    r.u8()?; // stake_referral_fee
    let sol_deposit_authority = r.opt_pubkey()?;
    let deposit_fee_ppm = r.fee_ppm()?;
    r.u8()?; // sol_referral_fee (referral account is pinned to our own ATA anyway)
    let sol_withdraw_authority = r.opt_pubkey()?;
    let cur_withdraw = r.fee_ppm()?;
    let next_withdraw = r.future_fee_ppm()?;

    Ok(PoolInfo {
        reserve_stake,
        pool_mint,
        manager_fee_account,
        total_lamports,
        pool_token_supply,
        last_update_epoch,
        deposit_fee_ppm,
        // Conservative: value pXNT at the worse of the current and scheduled fee.
        withdrawal_fee_ppm: cur_withdraw.max(next_withdraw),
        has_sol_deposit_authority: sol_deposit_authority.is_some(),
        has_sol_withdraw_authority: sol_withdraw_authority.is_some(),
    })
}

/// The reserve's canonical pXNT ATA under X1's ATA program. Pinning this stops a
/// crank from pointing NAV / flush / withdraw at some other token account the
/// reserve happens to own (which would mis-state NAV and let someone mint cheaply).
pub fn require_canonical_pool_ata(
    token_account: &Pubkey,
    reserve: &Pubkey,
    token_program: &Pubkey,
    pool_mint: &Pubkey,
) -> Result<()> {
    let ata_program = SolanaPubkey::try_from(X1_ATA_PROGRAM_ID)
        .map_err(|_| error!(VowError::InvalidPoolTokenAccount))?;
    let (expected, _) = Pubkey::find_program_address(
        &[reserve.as_ref(), token_program.as_ref(), pool_mint.as_ref()],
        &ata_program,
    );
    require_keys_eq!(*token_account, expected, VowError::InvalidPoolTokenAccount);
    Ok(())
}

fn fee_factor(ppm: u32) -> u128 {
    PPM - (ppm as u128).min(PPM - 1)
}

/// Lamports of NAV a stake deposit adds once it has been through the pool
/// (deposit fee now, withdrawal fee on exit). Shares are minted against this.
pub fn net_entry_lamports(config: &ProtocolConfig, lamports: u64) -> Result<u128> {
    if config.spl_stake_pool == Pubkey::default() {
        return Ok(lamports as u128);
    }
    Ok((lamports as u128)
        .checked_mul(fee_factor(config.deposit_fee_ppm))
        .ok_or(VowError::MathOverflow)?
        .checked_mul(fee_factor(config.withdrawal_fee_ppm))
        .ok_or(VowError::MathOverflow)?
        / (PPM * PPM))
}

/// Shares minted for a fresh stake deposit at the current (fresh) price.
pub fn shares_for_deposit(config: &ProtocolConfig, lamports: u64) -> Result<u128> {
    require!(config.current_share_price > 0, VowError::MathOverflow);
    let shares = net_entry_lamports(config, lamports)?
        .checked_mul(SHARE_PRECISION)
        .ok_or(VowError::MathOverflow)?
        .checked_div(config.current_share_price)
        .ok_or(error!(VowError::MathOverflow))?;
    // Never accept a deposit that buys nothing.
    require!(shares > 0, VowError::InsufficientStake);
    Ok(shares)
}

/// Value-moving instructions must use a price computed from this epoch's pool state,
/// otherwise anyone can trade against a known-stale price (mint before a reward
/// update, exit before a slash is reflected). No-op on testnet (no pool configured).
pub fn require_fresh_price(config: &ProtocolConfig) -> Result<()> {
    if config.spl_stake_pool == Pubkey::default() {
        return Ok(());
    }
    let epoch = Clock::get()?.epoch;
    require!(config.price_epoch >= epoch, VowError::PriceStale);
    Ok(())
}

pub struct NavInputs {
    pub reserve_lamports: u64,
    pub rent_exempt: u64,
    pub total_yield_claims: u64,
    pub total_pending_unstake: u64,
    pub pxnt_amount: u64,
    pub pool_total_lamports: u64,
    pub pool_token_supply: u64,
    pub deposit_fee_ppm: u32,
    pub withdrawal_fee_ppm: u32,
    pub total_shares: u128,
}

/// Max share price relative to the pool's redeemable rate (5/4 = 125%). Honest NAV sits
/// within a few % of the rate (pool surplus, saved fees); anything above this can only
/// come from donations or a near-empty share supply, and pricing off it would let a
/// sole holder inflate the price and steal the next depositor's rounding remainder.
pub const MAX_PRICE_OVER_RATE_NUM: u128 = 5;
pub const MAX_PRICE_OVER_RATE_DEN: u128 = 4;

pub struct NavPrice {
    pub price: u128,
    /// false when liabilities exceed every asset (NAV would be negative). The caller
    /// must then halt value-moving instructions instead of pricing at ~0.
    pub solvent: bool,
}

/// NAV-based share price (see module docs), capped at 125% of the redeemable pool
/// rate. Rounds down — dust stays with the protocol.
pub fn nav_share_price(i: &NavInputs) -> Result<NavPrice> {
    require!(i.pool_token_supply > 0 && i.pool_total_lamports > 0, VowError::EmptyReserve);
    let w = fee_factor(i.withdrawal_fee_ppm);
    let d = fee_factor(i.deposit_fee_ppm);

    // Redeemable value of one pool-token-lamport, in share-price units.
    let rate_price = ((i.pool_total_lamports as u128)
        .checked_mul(SHARE_PRECISION)
        .ok_or(VowError::MathOverflow)?
        / i.pool_token_supply as u128)
        .checked_mul(w)
        .ok_or(VowError::MathOverflow)?
        / PPM;
    let rate_price = rate_price.max(1);
    let cap = rate_price * MAX_PRICE_OVER_RATE_NUM / MAX_PRICE_OVER_RATE_DEN;

    if i.total_shares == 0 {
        return Ok(NavPrice { price: rate_price, solvent: true });
    }

    let pxnt_value = (i.pxnt_amount as u128)
        .checked_mul(i.pool_total_lamports as u128)
        .ok_or(VowError::MathOverflow)?
        / i.pool_token_supply as u128
        * w
        / PPM;
    let liquid = (i.reserve_lamports as u128).saturating_sub(i.rent_exempt as u128);
    let liabilities = i.total_yield_claims as u128 + i.total_pending_unstake as u128;

    let (nav, solvent) = if liquid >= liabilities {
        (pxnt_value + (liquid - liabilities) * d / PPM * w / PPM, true)
    } else {
        let shortfall = liabilities - liquid;
        (pxnt_value.saturating_sub(shortfall), pxnt_value >= shortfall)
    };

    let price = (nav
        .checked_mul(SHARE_PRECISION)
        .ok_or(VowError::MathOverflow)?
        / i.total_shares)
        .clamp(1, cap);
    Ok(NavPrice { price, solvent })
}

/// SOL the reserve must keep liquid: rent floor + every fixed claim on it.
pub fn required_liquidity(config: &ProtocolConfig, rent_exempt: u64) -> u64 {
    rent_exempt
        .saturating_add(config.total_yield_claims)
        .saturating_add(config.total_pending_unstake)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> NavInputs {
        NavInputs {
            reserve_lamports: 890_880,
            rent_exempt: 890_880,
            total_yield_claims: 0,
            total_pending_unstake: 0,
            pxnt_amount: 0,
            pool_total_lamports: 1_000_000,
            pool_token_supply: 1_000_000,
            deposit_fee_ppm: 1_000,
            withdrawal_fee_ppm: 1_000,
            total_shares: 0,
        }
    }

    #[test]
    fn flush_is_nav_neutral() {
        // 100 XNT idle vs the same 100 XNT flushed (pool rate 1.0, 0.1% deposit fee).
        let mut idle = base();
        idle.reserve_lamports += 100_000_000_000;
        idle.total_shares = 99_800_100_000; // shares minted at net-entry value, price 1.0
        let mut flushed = base();
        flushed.pxnt_amount = 99_900_000_000; // 100 XNT · (1 − 0.1%)
        flushed.total_shares = idle.total_shares;
        let a = nav_share_price(&idle).unwrap().price;
        let b = nav_share_price(&flushed).unwrap().price;
        assert!(a.abs_diff(b) <= 1, "{a} vs {b}");
        assert!(a.abs_diff(SHARE_PRECISION) <= 1);
    }

    #[test]
    fn liabilities_reduce_nav_one_for_one() {
        let mut i = base();
        i.pxnt_amount = 10_000_000_000;
        i.total_shares = 9_990_000_000;
        let before = nav_share_price(&i).unwrap().price;
        // 1 XNT claimed and the reserve is short: NAV drops by exactly that claim.
        i.total_yield_claims = 1_000_000_000;
        let after = nav_share_price(&i).unwrap().price;
        let drop = (before - after) * i.total_shares / SHARE_PRECISION;
        assert!(drop.abs_diff(1_000_000_000) <= 2, "{drop}");
        // Deposit 1 XNT of SOL to back it: back to the original price.
        i.reserve_lamports += 1_000_000_000;
        assert!(nav_share_price(&i).unwrap().price.abs_diff(before) <= 1);
    }

    #[test]
    fn price_is_capped_against_inflation() {
        // Sole holder with 49 shares and a huge donation: uncapped this prices a share at
        // ~1e9× the pool rate. Capped, a share is worth at most 1.25× redeemable rate.
        let mut i = base();
        i.pxnt_amount = 50_000_000_000;
        i.reserve_lamports += 1_000_000_000_000_000; // 1M XNT donated
        i.total_shares = 49;
        let p = nav_share_price(&i).unwrap();
        let rate = SHARE_PRECISION * 999 / 1000;
        assert_eq!(p.price, rate * 5 / 4);
        assert!(p.solvent);
    }

    #[test]
    fn insolvency_is_flagged() {
        let mut i = base();
        i.pxnt_amount = 1_000_000_000;
        i.total_shares = 1_000_000_000;
        i.total_yield_claims = 2_000_000_000; // owes more than everything it holds
        assert!(!nav_share_price(&i).unwrap().solvent);
    }
}
