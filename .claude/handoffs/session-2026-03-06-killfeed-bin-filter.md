# Handoff — 2026-03-06 Killfeed Bin Step Filter

## Resume With
"Continue from handoff session-2026-03-06-killfeed-bin-filter"

---

## What Was Done

### PR #164 — merged (fee_tvl_ratio + spike flags)
- All pool endpoints sort by fee_tvl_ratio instead of raw APY
- Added fee_tvl_ratio, fees_24h, apy_spike to /killfeed, /toppools, /pools
- Killfeed tier logic uses fee_tvl_ratio thresholds (0.5%/day=extreme, 0.25%=killer, 0.1%=alpha)
- Position monitor: "Fees Claimed" replaces "Fees (24h)", "Pool TVL" replaces "Liquidity", dropped pool_apy

### Direct push to main — bin_step filter (138accb)
- Added `allowed_bin_steps: [20, 80, 100]` to scanner config
- All three endpoints (/killfeed, /toppools, /pools) skip pools not in allowed bin steps
- bin_step field added to all response objects
- Reduces killfeed from ~103 pools to ~52

### DISCORD_WEBHOOK_ALERTS
- Already configured on Hugh in user-level systemd drop-in (~/.config/systemd/user/position-monitor.service.d/env.conf)
- No action needed

## Remaining Issues
- Extreme tier at ~13 pools (target <10) — could tighten FEE_TVL_EXTREME from 0.005 to 0.007
- `fees_24h` in wallet-fees is still pool-level (same value for all positions in same pool)
- Per-position APY showing 0% for all positions (Meteora position API returning 0)
- Per-position liquidity (Phase 2, #152) — needs on-chain liquidityShares parsing
- #137 — Hugh CLI reinstall still pending
- #131 — Shyft API key

## Key Files
- health_server.py: `/killfeed`, `/toppools`, `/pools`, `/wallet-fees`
- killfeed_discord_poster.py: tier logic, Discord embeds
- position_monitor.py: position feed embeds
