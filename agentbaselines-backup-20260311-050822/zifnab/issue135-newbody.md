## Context

`execute_meteora_trade` needs real implementation — open/close DLMM positions with wallet signing. Currently not wired into RpcIntegrator.

## Acceptance Criteria

- Call Meteora DLMM API to create/close positions
- Sign transactions with wallet private key (from vault)
- Submit on-chain and confirm
- Return position signature and status
- Integrated with trade executor's rebalance logic

## Ref

- Pryan-Fire #122 (volatility-aware rebalancing)
- Dependent on Jupiter integration (#134) for swap execution

## Implementation Owner

Zifnab (per Lord Xar directive 2026-03-01)

**Status:** Pending completion of Jupiter integration (#134).