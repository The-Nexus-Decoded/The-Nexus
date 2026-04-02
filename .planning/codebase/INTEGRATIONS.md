# External Integrations

**Analysis Date:** 2026-04-02

## APIs & External Services

**Blockchain & DEX:**
- Solana RPC - Primary blockchain interaction
  - SDK/Client: `solana` (Python), `@solana/web3.js` (TypeScript)
  - Endpoints: `https://api.mainnet-beta.solana.com` (primary), `https://api.devnet.solana.com` (testnet)
  - Auth: `SOLANA_RPC_URL` environment variable
  
- Jupiter DEX - Token swap aggregation and routing
  - SDK/Client: Jupiter Python SDK (legacy), Jupiter Ultra v1 API
  - Endpoints: `https://api.jup.ag/ultra/v1` (Ultra), `https://quote-api.jup.ag/v6` (quotes)
  - Auth: `JUPITER_API_KEY` environment variable
  - Usage: `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/rpc_integration.py`

- Meteora DLMM - Liquidity pool management
  - SDK/Client: `@meteora-ag/dlmm` 1.9.3 (TypeScript)
  - Endpoints: `https://dlmm-api.meteora.ag/pair/all`, `https://app.meteora.ag/dlmm/{address}`
  - Usage: Position monitoring, liquidity management in trade executor
  - Files: `Pryan-Fire/hughs-forge/services/trade-executor/`, `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/`

**Data & Analytics:**
- Pyth Network - Real-time price feeds
  - Endpoints: `https://hermes.pyth.network/v2/updates/price/latest`
  - Client: httpx/requests
  - Usage: `Pryan-Fire/hughs-forge/services/trade-executor/main.py` (price oracle)
  - Files: `Pryan-Fire/hughs-forge/meteora-trader/src/pyth-hermes-client/`

- DEX Screener - Token information and price data
  - Endpoints: `https://api.dexscreener.com/latest/dex/search/?q=solana`, `https://api.dexscreener.com/latest/dex/tokens/{mint_address}`
  - Usage: Signal generation, position monitoring
  - Files: `Pryan-Fire/haplos-workshop/signal-intel/`, `Pryan-Fire/hughs-forge/scripts/`

**AI & Content Generation:**
- Gemini API - Image generation and multimodal AI
  - SDK/Client: `@google/genai` 1.3.0
  - Auth: `GEMINI_API_KEY` environment variable
  - Model: `gemini-2.5-flash-image` (configurable via `IMAGE_MODEL`)
  - Usage: Art pipeline image generation
  - Files: `Pryan-Fire/services/image-gen-mcp/index.js` (MCP server)
  - Protocol: Model Context Protocol (stdio or HTTP transport)

## Data Storage

**Databases:**
- SQLite 3 - Embedded relational database
  - Connection: File-based (local `.db` files)
  - Usage: Trade ledgers, position state, audit logs
  - Files:
    - `Pryan-Fire/hughs-forge/services/trade-executor/models/ledger.py` - `TradeLedger` class
    - `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/state/state_manager.py` - `TradeStateManager` class
  - Client: Python `sqlite3` module
  - Tables:
    - `trades` - Trade history with symbol, price, amount, status
    - State persistence with JSON metadata

**File Storage:**
- Local filesystem only
  - Art pipeline output: `/data/openclaw/shared/art-pipeline/`
  - Wallet keys: `/data/openclaw/keys/trading_wallet.json`
  - Logs: `/data/openclaw/logs/meteora_audits.log`
  - Position monitor state: `/data/openclaw/.position_monitor_state.json`

**Caching:**
- None detected (in-memory state via Python objects)

## Authentication & Identity

**Auth Provider:**
- Custom wallet-based (Solana keypairs)
  - Implementation: `Keypair` from `solders` library
  - Files: `Pryan-Fire/hughs-forge/services/trade-executor/models/keys.py`
  - Wallet path: `/data/openclaw/keys/trading_wallet.json` (JSON array of bytes)

- Discord Bot Token
  - Implementation: discord.py bot authentication
  - Env var: `RISK_MANAGER_DISCORD_TOKEN`, `DISCORD_TOKEN`
  - Permissions: Message sending, embed creation, webhook interaction

## Monitoring & Observability

**Error Tracking:**
- Discord webhooks (custom implementation)
  - Multiple webhook URLs for different alert levels (EXTREME, KILLER, ALPHA, POSITIONS, TRADE_ALERTS)
  - Environment variables: `DISCORD_WEBHOOK_ALERTS`, `DISCORD_WEBHOOK_EXTREME`, `DISCORD_WEBHOOK_KILLER`, `DISCORD_WEBHOOK_ALPHA`, `DISCORD_WEBHOOK_POSITIONS`, `DISCORD_WEBHOOK_TOPPOOLS`, `DISCORD_TRADE_ALERTS_WEBHOOK`
  - Usage: Position updates, trade alerts, risk warnings
  - Files: `Pryan-Fire/hughs-forge/scripts/killfeed_discord_poster.py`, `Pryan-Fire/hughs-forge/services/trade-executor/main.py`

**Logs:**
- File-based logging
  - `trade_executor_audit.log` (local)
  - `/data/openclaw/logs/meteora_audits.log` (shared)
  - Configuration: Python `logging` module with file + stream handlers
  - Files: `Pryan-Fire/hughs-forge/services/trade-executor/main.py`, `Pryan-Fire/hughs-forge/services/risk-manager/logger.py`

- Health servers (internal)
  - Endpoints: `http://127.0.0.1:8002/` (position monitor, health status)
  - Implementation: FastAPI health check endpoints
  - Files: `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/health_server.py`

## CI/CD & Deployment

**Hosting:**
- Self-hosted Linux servers
  - ola-claw-trade (Hugh) - Trade execution
  - ola-claw-dev (Haplo) - Development/testing
  - SSH user: `openclaw` on all servers
  - Deployment via SSH with systemd user services

**CI Pipeline:**
- GitHub Actions
  - Workflows: `.github/workflows/` directory
  - Primary CI: `phantom-gauntlet.yml` (PR validation)
  - Deploy: `deploy-mvp.yml` (push to main triggers auto-deploy)
  - Trade-specific: `trade-executor-ci.yml`, `deploy-to-trade.yml`, `deploy-trade-services.yml`
  - Runners: self-hosted (`[self-hosted, linux, tailscale]`)

## Environment Configuration

**Required env vars:**
- Blockchain: `SOLANA_RPC_URL`, `JUPITER_API_KEY`
- AI: `GEMINI_API_KEY`
- Discord: `DISCORD_TOKEN`, `RISK_MANAGER_DISCORD_TOKEN`, multiple `DISCORD_WEBHOOK_*` URLs
- Trading: `TRADING_WALLET_PATH`, `TRADING_WALLET_SECRET`
- Health: `HEALTH_SERVER_URL`
- Monitoring: `POSITION_MONITOR_ENABLED`, `POSITION_MONITOR_STATE_FILE`, `WALLET_OWNER`, `WALLET_BOT`

**Secrets location:**
- Environment variables (systemd `.service` files on servers)
- Wallet JSON file: `/data/openclaw/keys/trading_wallet.json` (private, not committed)
- GitHub secrets: Accessed in Actions workflows (e.g., `TRADE_SERVER_SSH_KEY`, `TRADE_SERVER_HOST`, `TRADE_SERVER_USER`)

## Webhooks & Callbacks

**Incoming:**
- Discord webhooks (inbound message handling)
  - Risk manager bot: Listens in Discord channel, routes to trade API
  - Implementation: `discord.py` event handlers
  - Files: `Pryan-Fire/hughs-forge/services/risk-manager/discord_bot.py`

- Health/monitoring endpoints
  - Internal endpoints for position and position monitoring
  - Endpoint: `http://<trade-server>:8002/killfeed`, `http://<trade-server>:8002/toppools`

**Outgoing:**
- Discord webhooks (alerts and telemetry)
  - Post alerts on trades, positions, risks, killfeed
  - Implementation: httpx POST requests with JSON embeds
  - Files: 
    - `Pryan-Fire/hughs-forge/scripts/killfeed_discord_poster.py`
    - `Pryan-Fire/hughs-forge/scripts/position_monitor.py`
    - `Pryan-Fire/hughs-forge/services/trade-executor/main.py`

- Solana RPC subscriptions
  - Monitor account changes for liquidity pools and positions
  - Implementation: AsyncClient subscription patterns
  - Usage: Real-time position tracking

## Internal Services Integration

**Trade Orchestrator:**
- Coordinates multiple services via message passing and state management
- Integrates: RPC integration, Jupiter API, Meteora protocol, state persistence
- Health server: Exposes `/health`, `/positions`, `/state` endpoints
- Files: `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/`

**Risk Manager:**
- Monitors positions, liquidity, and portfolio health
- Discord interface for alerts and manual intervention
- Integration with trade executor for position updates
- Files: `Pryan-Fire/hughs-forge/services/risk-manager/`

**Trade Executor:**
- Executes trades via Jupiter API
- Manages Meteora DLMM positions
- Persists state to SQLite, logs to audit files
- Sends Discord alerts on trade events
- Files: `Pryan-Fire/hughs-forge/services/trade-executor/`

---

*Integration audit: 2026-04-02*
