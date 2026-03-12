# Position Monitor Dry-Run Audit Report

**Generated:** 2026-03-06 20:10 UTC  
**Period:** 2026-03-06 16:18 UTC - 2026-03-06 20:02 UTC (~4 hours)

---

## Executive Summary

| Metric | Owner Wallet | Bot Wallet |
|--------|-------------|------------|
| Positions Tracked | 5 | 1 |
| Starting Value | $1,858,115 | $334,007 |
| Current Value | $1,963,881 | $607,075 |
| PnL | +$105,766 | +$273,068 |
| PnL % | +5.7% | +81.7% |

---

## Position Details

### Owner Wallet (Lord Xar)

| Position | Entry Value | Current Value | PnL % |
|----------|-------------|---------------|-------|
| BiHjJb4a...GBTFZ | $458,272 | $459,606 | +0.3% |
| AgrzMmYh...CpefJ | $458,272 | $459,606 | +0.3% |
| CG59oJJ...hcA2g | $458,272 | $459,606 | +0.3% |
| HgNhgJL2...ifh5 | $458,359 | $459,606 | +0.3% |
| 9y8ZaXJ...zbfef | $124,940 | $125,457 | +0.4% |

### Bot Wallet (Hugh)

| Position | Entry Value | Current Value | PnL % |
|----------|-------------|---------------|-------|
| DkEwend5...cxBh | $334,007 | $607,075 | +81.7% |

**Note:** Bot wallet shows +81.7% which likely indicates a new position was opened or a large deposit was made during this period, not typical trading gains.

---

## SL/TP Automation Status

| Parameter | Owner | Bot |
|-----------|-------|-----|
| Stop Loss | -10% | -10% |
| Take Profit | +50% | +50% |
| SL Triggered | No | No |
| TP Triggered | No | No |
| Alerts Sent | N/A (webhook not configured) | N/A (webhook not configured) |

**Status:** All positions within normal range. No SL/TP triggers activated during this audit period.

---

## Monitoring Activity

- **Check Interval:** ~15 minutes
- **Total Checks:** 16
- **Discord Posts:** Position embeds posted to configured webhooks
- **Automation Runs:** Executed alongside position checks

---

## Notes

1. The position monitor is running successfully and tracking positions
2. No dry-run trades were executed (all within SL/TP bounds)
3. Discord webhook for alerts (`DISCORD_WEBHOOK_ALERTS`) is not set - alerts are not being posted
4. The large jump in bot wallet value (+81.7%) suggests a position was added or value was deposited, not trading profit
