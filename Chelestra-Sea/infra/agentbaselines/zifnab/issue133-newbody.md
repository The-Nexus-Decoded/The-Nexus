## Context

Hugh's devnet testing discovered Jupiter quoting fails. The integration has been updated to use the new `api.jup.ag` endpoints, but these endpoints **require an API key**.

**Current state:**
- Code updated to support API key header (client configured via env var)
- No API key present in Hugh's environment
- Without key: requests fail (likely 401/403)

## Acceptance Criteria

- [ ] Obtain Jupiter portal API key from Lord Xar
- [ ] Add `JUPITER_API_KEY` to Hugh's server environment (or vault)
- [ ] Verify DNS resolution to `api.jup.ag` succeeds
- [ ] Integration test confirms successful price quote on devnet
- [ ] Client gracefully handles missing/invalid key with clear error

## Ref

- <#1475082964156157972> HughTheHand testing report (2026-03-02)
- Related to Pryan-Fire #122 sub-issues (#133, #134, #135)

## Implementation Owner

Zifnab (per Lord Xar directive 2026-03-01)

**Blocked:** Awaiting Jupiter API key credential from Lord Xar.