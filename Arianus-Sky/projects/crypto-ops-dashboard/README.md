# Pryan Fire Crypto Ops Dashboard

Mobile-first Vue/PWA operator dashboard for the Pryan-Fire crypto tools requested in issue #296.

## Scope

This first cut is intentionally read-only / dry-run by default. It gives Hugh an application workflow to validate behavior instead of testing Python scripts directly.

Surfaced modules:

- Portfolio overview: equity, PnL, exposure, risk posture
- DLMM manager: positions, pool IDs, close state, fees, tx status
- Position monitor / SLTP: #277 validation chain evidence
- Sniper tool: scanner status, candidates, rejected reasons
- Top pool view: liquidity, volume, fees, risk signal
- Kill feed / alerts: explicit tx submitted vs none submitted
- Hugh validation panel: per-PR evidence checklist

## Run locally

```bash
cd Arianus-Sky/projects/crypto-ops-dashboard
npm install
npm run dev
```

Build and validation test:

```bash
npm run test:validation
npm run build
```

## Data integration contract

The UI first tries the read-only Pryan-Fire API facade endpoints under `/api/crypto/*`, then falls back to `/api/crypto-ops/summary.json`, then to safe fixture data.

A fixture-backed stdlib facade lives at `Pryan-Fire/haplos-workshop/crypto-ops-api/` for Phase 2 validation. Run it on port 8787 while using Vite dev server; `vite.config.js` proxies `/api/crypto*` to the facade.

Validation evidence posts to `POST /api/crypto/validation/:id/result` and accepts evidence fields only. Trading/tx fields are rejected server-side.

Live actions are disabled unless every gate is explicit:

- `risk.liveTrading === true`
- `risk.killSwitch === "CLEAR"`
- `risk.walletAuth === "connected"`
- every `risk.gates[].state === "passed"`

Until those gates are visible and passing, the app must remain read-only/dry-run.

## Hugh validation workflow

For #277-style validation, Hugh should confirm the UI shows:

1. monitor
2. trigger
3. close executor
4. alert
5. state persistence

The UI must distinguish dry-run, failed attempt, submitted transaction, and confirmed transaction. The fixture currently proves the safe-mode path with `none submitted` transaction state.
