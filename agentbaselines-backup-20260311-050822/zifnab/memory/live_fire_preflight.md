# Live-Fire Risk Pre-Flight Checklist (SOL/USDC - $250)

## Tier 1: Infrastructure (Hard Stop)
- [ ] RPC Latency: < 150ms (Verified via `fleet health`)
- [ ] Rate Guard Budget: > 50% remaining for Gemini Flash
- [ ] Gateway Memory: < 80% usage on `ola-claw-trade`

## Tier 2: Trading Logic (Soft Stop/Nudge)
- [ ] Slippage Tolerance: Set to 0.5% (Max)
- [ ] Sight Mismatch: 2% Circuit Breaker verified active
- [ ] Position Range: Bins aligned with current SOL volatility (±1.5%)

## Tier 3: Strategy (Profitability)
- [ ] Dynamic Fee: > 0.15% (to cover rebalance costs)
- [ ] Volatility Scale: Active in `StrategyEngine`
