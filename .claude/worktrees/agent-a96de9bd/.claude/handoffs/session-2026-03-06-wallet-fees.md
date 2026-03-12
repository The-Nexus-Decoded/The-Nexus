# Handoff — 2026-03-06 Wallet Fees + Toppools Fix Session

## Resume With
"Continue from handoff session-2026-03-06-wallet-fees"

---

## What Was Done This Session
- Fixed /toppools 404 → PR #143 merged, issue #142 closed
  - Wired health_server.py into TradeOrchestrator.py as daemon thread
  - Fixed deploy-mvp.yml: installs service file, uses requirements.txt, correct venv path
  - Fixed patryn-trader.service for user-service (journal output, network-online)
  - Killed ghost combined_runner.py (deleted from disk, running in RAM since Mar 5)
  - Added `tailscale` label to GitHub Actions runner (was missing)
- Added /wallet-fees endpoint → PR #144 merged, issues #120 + #121 closed
  - Fixed DLMM program ID, dataSize (8120), owner offset (40)
  - Enriches positions with pool info from Meteora API
  - Owner: 3 positions in Lobstar-SOL, Bot: 1 position in SOL-USDC
- Switched SOLANA_RPC_URL on Hugh from dead Helius key to public mainnet RPC

---

## Still Open

### Shyft API Key Issue
- User provided key `TST59k6ZAB4XSmRxyeah` — returns "Unauthorized" on all Shyft endpoints
- Ticket #131 (SHYFT_API_KEY on Hugh) still open — key needs verification

### Helius Key Dead (#131)
- Key `9ff06f3e-d92b-4ac8-a6ab-7ec3c784b482` returns "Invalid API key" for all calls except getHealth
- Switched to public RPC as workaround — but public RPC may rate-limit
- Need fresh Helius key or alternative RPC provider

### CI Runner Queue Issues
- Deploy workflows get stuck in "queued" state
- Workaround: manual deploy via SSH (git pull + systemctl restart)
- Runner has correct labels now (self-hosted, Linux, X64, tailscale)
- May need investigation of why queued jobs don't pick up

### Pending Tasks (Not Started)
- Daily embed cleanup — delete old Discord messages before each new post
- Hugh CLI reinstall (#137)
- #133 — toppools Discord channel posting (endpoint works now, needs verification of poster)

---

## Key Facts
- Hugh IP: 100.104.166.53, port 8002
- Service: patryn-trader.service (user systemd, runs TradeOrchestrator.py + health_server)
- DLMM V2 Program: LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo
- Owner wallet: sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb (3 pos, Lobstar-SOL)
- Bot wallet: 74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x (1 pos, SOL-USDC)
- Deploy path: /data/repos/The-Nexus/ (git pull from GitHub)
- Env secrets: /home/openclaw/.config/systemd/user/patryn-trader.service.d/env.conf
- SOLANA_RPC_URL: now public mainnet (was dead Helius)
