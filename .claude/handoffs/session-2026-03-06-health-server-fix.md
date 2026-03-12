# Handoff — 2026-03-06 Health Server Data Quality Fix

## Resume With
"Continue from handoff session-2026-03-06-health-server-fix"

---

## Issue
**#152** — https://github.com/The-Nexus-Decoded/The-Nexus/issues/152
`/wallet-fees` endpoint returns pool-level data instead of per-position data.

## Ownership
Alfred (me) owns this fix. PRs go to sterol for review. Haplo can audit.

---

## Confirmed Findings

### Bug 1 — FIXED OFFSETS for bin IDs
Current code reads offsets 72/76 (which is start of liquidity_shares array → garbage).
**Correct offsets:**
- `lower_bin_id`: offset **7912**
- `upper_bin_id`: offset **7916**

Verified against all 4 live positions:
- BiHjJb: lower=-393, upper=-325 (68 bins wide)
- AgrzMm: lower=-411, upper=-343 (68 bins wide)
- CG59oJ: lower=-407, upper=-339 (68 bins wide)
- DkEwen (SOL-USDC bot): lower=-24229, upper=-24160 (69 bins wide)

Account struct facts:
- POSITION_MIN_SIZE = 8112 (from SDK, excludes 8-byte discriminator)
- POSITION_BIN_DATA_SIZE = 112 bytes per bin
- Total account data = 8120 bytes

### Bug 2 — active_bin_id always 0
`pool.get("active_id", 0)` — `active_id` key does NOT exist in Meteora pair API response.
Need to either:
(a) Parse from lb_pair account data on-chain
(b) Calculate from `current_price` and `bin_step` using formula

Meteora pair API keys available: name, bin_step, liquidity, today_fees, apy,
current_price, fees_24h, trade_volume_24h, cumulative_fee_volume

To calculate active_bin_id from current_price and bin_step:
  price = (1 + bin_step/10000)^bin_id
  bin_id = log(price) / log(1 + bin_step/10000)
  Use math.log() — result will be a float, round to int.

### Bug 3 — liquidity_usd is pool TVL
`_calculate_usd_liquidity(pool)` returns pool total TVL (~$262k for Lobstar-SOL).
All 3 positions show same value.

**Status: NOT YET SOLVED** — need per-position data.
Options:
(a) Parse liquidityShares from on-chain data (complex, requires token prices)
(b) Divide pool liquidity by position count (inaccurate but fast)
(c) Use Meteora position endpoint `https://dlmm-api.meteora.ag/position/{addr}` which
    returns fee_apy_24h, total_fee_usd_claimed but NOT current liquidity

Best path: for now show N/A or "see Meteora" for per-position liquidity.
Later: parse on-chain liquidityShares × token prices from lb_pair bin data.

### Bug 4 — fees_24h is pool total
`pool.get("today_fees", 0)` = pool's total fees today (all positions combined).
Meteora `/position/{addr}` returns `fee_apy_24h` and `total_fee_usd_claimed` (historical).
No real-time per-position fee data available from Meteora API.

For now: show `fee_apy_24h` from `/position/{addr}` instead.

---

## Fix Plan

### Phase 1 (immediate, unblocks correct display):
1. Fix `_parse_position` in health_server.py:
   - Change offsets from 72/76 to 7912/7916
2. Fix `_enrich_positions`:
   - Add `active_bin_id` calculation: `int(math.log(current_price) / math.log(1 + bin_step/10000))` or parse from lb_pair
   - Change `in_range` check to use calculated active_bin_id
3. Per-position fees: call `https://dlmm-api.meteora.ag/position/{addr}` for each position
   - Use `fee_apy_24h` field (position-level APY)
   - Keep pool-level `apy` as "pool APY"
4. For liquidity_usd: add note "(pool TVL)" to be honest, or divide by position count

### Phase 2 (proper per-position liquidity):
- Parse liquidityShares from on-chain position account data
- Get bin token amounts from lb_pair's bin data
- Multiply by token prices to get USD value

---

## Key Paths
- health_server.py: `/data/repos/The-Nexus/Pryan-Fire/hughs-forge/services/trade-orchestrator/src/health_server.py`
- Branch to create: `fix/health-server-per-position-data`
- PR targets main, sterol reviews

## Live Position Addresses
- Owner: BiHjJb4a9FmSgb3BkPUeWvchiAK8oLtMMdRB124GBTFZ
- Owner: AgrzMmYhYJ25iw5JGAaXpxYdE7dSusaDiUWeZFFCpefJ
- Owner: CG59oJJ8LJffcFsvHXSfJThxkJ68EzYdzAaFcAChcA2g
- Bot: DkEwend5Cjiz4edwMKSfgQtNBqzSF4iAzFNJhVrGcxBh
- Lobstar-SOL lb_pair: 53Gc9uyzrU1Cn82YxDqsgfRjptXecSsr3mLYYH7VWpjV
- SOL-USDC lb_pair: HTvjzsfX3yU6BUodCjZ5vZkUrAxMDTrBs3CJaq43ashR
