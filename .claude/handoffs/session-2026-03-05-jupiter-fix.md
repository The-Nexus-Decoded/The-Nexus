# Session Handoff: Jupiter Trade Execution Fix (2026-03-05)

**Ticket:** Pryan-Fire #212
**Status:** Code read, ready to implement
**Context at pause:** 85%

## What We're Fixing

`rpc_integration.py` at:
`Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/rpc_integration.py`

### Current State (on main branch, on Haplo server)

The file already has the Jupiter integration from the closed PRs merged into main somehow. It has:
- Jupiter quote/swap API calls (working)
- Wallet loading from JSON file (no dry_run guard)
- `Transaction.deserialize` (WRONG — needs `VersionedTransaction`)
- Returns `True` after `send_transaction` without checking result (BUG #165)
- Hardcoded output mint (Wrapped SOL)
- Hardcoded decimals = 9

### Changes Needed (from ticket #212)

1. **VersionedTransaction**: Import `VersionedTransaction` from `solders.transaction`, use `VersionedTransaction.from_bytes()`, fall back to legacy `Transaction` if versioned fails
2. **On-chain confirmation**: Capture tx signature, call `client.confirm_transaction(sig, commitment="confirmed")`, timeout 30s, return False on failure
3. **Parameterize**: `output_mint` and `decimals` as parameters to `execute_jupiter_trade`
4. **Wallet safety**: try/except on wallet load, support `dry_run=False` param in `__init__`
5. **main.py shutdown**: Restore `event_loop.stop()` + `loop_thread.join(timeout=5)` on KeyboardInterrupt
6. **Tests**: Add `tests/test_rpc_integration.py`

### Branch to Create

```bash
cd /data/openclaw/workspace/The-Nexus
git fetch origin && git checkout main && git pull origin main
git checkout -b fix/165-jupiter-trade-execution
```

### Files to Modify

- `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/rpc_integration.py` — main fix
- `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/main.py` — shutdown fix
- New: `Pryan-Fire/hughs-forge/services/trade-orchestrator/tests/test_rpc_integration.py`

### PR Rules

- Request review from Zifnab and Lord XAR
- Do NOT merge — wait for review
- One concern only (Jupiter trade execution)

## Other Session Work Completed

- Scrubbed real name from Hugh/Zifnab MEMORY.md
- Updated handoff doc channel table to shared layout
- Added trigger shortcuts (hap, zif, hand) to all system prompts
- Created catch-up.html, added Quick Links to README.md + CLAUDE.md
- Audited 47 open issues — 16 should be closed (junk/dupes/stale)
- Closed PRs #207 and #208, created ticket #212
- Added Git Discipline directive to all 3 SOUL.md files
- All gateways restarted

## Issue Cleanup Still Pending

Close these 16 issues:
- Junk: #93, #78, #77, #69, #68
- Duplicates: #79 (dup of #36), #76 (dup of #67), #33 (dup of #32)
- Stale: #40, #39, #38, #36, #35, #27, #26, #7

Relabel #31 and #30 from area:sea to area:fire.
