# GSD Project: Crypto Trading Pipeline

## Phase 1: Infrastructure & Core Runes (DONE)
- [x] Repository Structure: `hughs-forge/` initialized.
- [x] Dependency Pinning: Web3.js v1 strictly locked.
- [x] Risk Manager (PY): Warden gating logic with asyncio locks.
- [x] PositionManager (TS): Meteora LP discovery and claimSwapFee runes.
- [x] Audit Logger: JSONL Chronicler for strike trails.
- [x] CI/CD Workflow: Deploy to 100.104.166.53 via SSH secrets.

## Phase 2: Jupiter Integration & Execution (IN PROGRESS)
- [x] Jupiter v6 → v1 endpoint migration (`api.jup.ag/swap/v1`) — old `quote-api.jup.ag` is dead (Chelestra-Sea #71)
- [x] Transaction signing fix: uses `msg.is_signer(i)` for robust signature placement (solders 0.27.1 compatible)
- [ ] Skip preflight: `skip_preflight=True` — Jupiter already simulates the tx
- [ ] Dynamic compute units: `dynamicComputeUnitLimit: true` in swap requests
- [x] Priority fees: `prioritizationFeeLamports: "auto"` in swap requests
- [ ] Async confirmation: poll `getSignatureStatuses` instead of blocking
- [ ] Restrict intermediate tokens: `restrictIntermediateTokens: true`
- [x] Wallet provisioned at `/data/openclaw/keys/trading_wallet.json`
- [x] Jupiter API key rotated and deployed fleet-wide
- [ ] Fix false-positive trade status (code returns True on failure) — GitHub #164

## Phase 3: Advanced Features (NEXT)
- [ ] Fee Compounding Loop: Claim -> Reinvest logic.
- [ ] P&L Engine: IL and gas cost subtraction.
- [ ] Pyth Hermes Integration: Real-time price feeds.
- [ ] Multi-Oracle Validation (OR-001): (GitHub #162)
  - Cross-check prices across Jupiter + 2-3 DEXs (Raydium/Orca/Saber) with tolerance band to prevent manipulation/stale quotes.
- [ ] Token Amount Display Bug (BUG-001): (GitHub #163)
  - Fix user-facing displays to show human-readable token amounts by applying decimal scaling (SOL: 9, USDC: 6, etc.)
- [x] Systemd Service: Persistence on Trade server.
- [ ] Jito bundle integration for competitive trade execution
