# Wallet History Analysis for Strategy V2

**Generated:** 2026-03-05

## Wallet Addresses

| Wallet | Address | Purpose |
|--------|---------|---------|
| Trading | `74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x` | Bot execution |
| Owner | `sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb` | Read-only, funds |

## Recent Activity Summary (via Solana RPC)

### Trading Wallet (last 15 transactions)

| Slot | Block Time | Error | Signature (first 20 chars) |
|------|------------|-------|---------------------------|
| 403870711 | 2026-01-30T23:25:50Z | - | 2RaNvmjmwwRk7XRdL1ud... |
| 403867125 | 2026-01-30T23:02:17Z | - | 4MMorrmx7BbwyYGo5LiG... |
| 403867100 | 2026-01-30T23:01:67Z | InsufficientFundsForRent | 39KRRFYAwLV2ug1E72Y... |
| 403867099 | 2026-01-30T23:01:67Z | InsufficientFundsForRent | KDfZQg9bUitoFbFzsHtP... |
| 403867099 | 2026-01-30T23:01:67Z | InsufficientFundsForRent | 5JiYZA6k97cR9yp5ReE... |

**Observation:** Trading wallet has had InsufficientFundsForRent errors - likely needs more SOL balance for rent exemption.

### Owner Wallet (last 10 transactions)

Recent transactions show activity with:
- Meteora DLMM program (`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`)
- Token transfers (mint: `8jiVXftnn2ZG6bugK7HAH5j2G3D6TpsG521gqsWwpump`)
- Associated token account creations

## Fee Analysis

- Trading wallet fees: ~80,000 lamports (0.00008 SOL) per transaction
- Owner wallet fees: ~5,000 lamports (0.000005 SOL) per transaction

## Current Balances (2026-03-05)

| Wallet | Balance (SOL) | Status |
|--------|---------------|--------|
| Trading | 0.213 | ✅ Funded (enough for rent + fees) |
| Owner | 0.835 | ✅ Funded |

## Recommendations for Strategy V2

1. **Maintain minimum SOL balance:** Ensure trading wallet has >0.01 SOL for rent + fees
2. **Monitor Meteora interactions:** Owner wallet actively uses DLMM - may indicate position management
3. **Fee tolerance estimate:** Based on recent activity, 5,000-10,000 lamports is typical per swap

## Next Steps

- Need Helius API key for detailed transaction parsing (token amounts, swap routes)
- Could implement a simple cron to fetch signatures daily and log to CSV
- Archive this analysis in `Abarrach-Stone/` for future reference
