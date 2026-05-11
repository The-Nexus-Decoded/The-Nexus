# Crypto Ops API Facade

Read-only Pryan-Fire API facade for The-Nexus #296.

V1 is fixture-backed and safe by construction:

- no wallet imports
- no executor imports
- no live-money endpoints
- no transaction submission fields accepted by validation writes

## Run

```bash
cd Pryan-Fire/haplos-workshop/crypto-ops-api
python -m crypto_ops_api.facade --host 127.0.0.1 --port 8787
```

## Endpoints

- `GET /api/crypto/health`
- `GET /api/crypto/portfolio`
- `GET /api/crypto/positions/dlmm`
- `GET /api/crypto/positions/monitor`
- `GET /api/crypto/close/state`
- `GET /api/crypto/sniper/status`
- `GET /api/crypto/sniper/candidates`
- `GET /api/crypto/pools/top`
- `GET /api/crypto/risk/feed`
- `GET /api/crypto/kill-switch`
- `GET /api/crypto/validation/prs`
- `GET /api/crypto/revenue/strategies`
- `GET /api/crypto/revenue/readiness`
- `POST /api/crypto/revenue/plan` (dry-run planning only; rejects live trading fields)
- `POST /api/crypto/validation/:id/result`
- `GET /api/crypto-ops/summary.json` legacy aggregated payload for the dashboard shell

Validation POST accepts evidence only: `result`, `evidence`, `riskNotes`, `tester`, `screen`, `blockedReason`.
Revenue plan POST accepts safe planning fields only: `strategyId`, `token`, `pair`, `amountUsd`, `profitTargetBps`, `stopLossBps`, `maxSlippageBps`, `source`.
Both POST surfaces reject trading/action fields such as `trade`, `tx`, `submitTx`, `amount`, or wallet actions.

## Test

```bash
cd Pryan-Fire/haplos-workshop/crypto-ops-api
PYTHONPATH=. python -m unittest discover -s tests
```
