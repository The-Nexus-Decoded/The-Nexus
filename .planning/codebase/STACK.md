# Technology Stack

**Analysis Date:** 2026-04-02

## Languages

**Primary:**
- Python 3.12 - Trade services, scripting, orchestration, risk management
- TypeScript 5.3+ - Meteora trading client, XR spatial resolver, Next.js dashboard
- JavaScript (Node.js 20) - Image generation MCP server, Next.js applications
- Bash - Infrastructure scripting, deployment automation

**Secondary:**
- Go - Not detected
- Rust - Not detected (Solana SDK uses Rust internally)

## Runtime

**Environment:**
- Node.js 20 (used in CI/CD workflows)
- Python 3.12 (used in CI/CD workflows)

**Package Manager:**
- npm (Node.js projects)
- pip (Python projects)
- Lockfiles: `package-lock.json` present for Node.js, `requirements.txt` pinned for Python

## Frameworks

**Core:**
- FastAPI 0.100.0+ - Trade orchestrator API, risk manager API, health servers
- Next.js 16.1.6 - Arianus-Sky dashboard (React 19.2.3, TypeScript 5)
- Uvicorn 0.20.0+ - ASGI server for FastAPI applications

**Blockchain:**
- @solana/web3.js 1.91.6 - Solana RPC interactions, wallet management
- @coral-xyz/anchor 0.30.1 - Anchor framework for Solana program interaction
- @meteora-ag/dlmm 1.9.3 - Meteora DLMM liquidity management protocol
- solana (Python) 0.36.11+ - Python Solana client library
- solders 0.21.0+ - Solana transaction building and signing
- anchorpy - Anchor framework Python bindings

**Testing:**
- pytest 7.0.0+ - Python unit tests
- unittest - Python standard library testing (fallback)

**Build/Dev:**
- TypeScript 5.3.3+ - Type checking
- Tailwind CSS 4 - Utility-first CSS framework (Arianus-Sky)
- ESLint 9 - Linting (Next.js via eslint-config-next)
- Zod 3.24.0 - TypeScript-first schema validation (MCP server)

**API/Communication:**
- discord.py 2.0.0+ - Discord bot integration, messaging
- @modelcontextprotocol/sdk 1.12.1 - Model Context Protocol server framework
- httpx 0.24.0+ - Async HTTP client for RPC and API calls
- requests 2.28.0+ - HTTP client library
- axios 1.6.7+ - HTTP client for JavaScript/Node.js

## Key Dependencies

**Critical:**
- @google/genai 1.3.0 - Gemini API integration for image generation
- discord.py 2.0.0+ - Discord bot webhooks and messaging (telemetry, alerts)
- solana ecosystem packages - Blockchain interaction core
- pydantic 2.0.0+ - Data validation and settings management (FastAPI)

**Infrastructure:**
- fastapi + uvicorn - REST API serving for trade services
- Three.js 0.160.0 - 3D rendering for XR spatial resolver
- sqlite3 - Embedded database for trade ledgers and state persistence
- json, datetime, logging - Standard library utilities

**Data Handling:**
- pandas 2.0.0 - Data analysis (risk manager)
- numpy 1.24.0 - Numerical computing (risk manager)
- scikit-learn 1.3.0 - Machine learning (risk manager)

## Configuration

**Environment:**
Configuration via environment variables:
- `GEMINI_API_KEY` - Google Gemini API authentication
- `DISCORD_TOKEN` / `RISK_MANAGER_DISCORD_TOKEN` - Discord bot credentials
- `SOLANA_RPC_URL` - Solana RPC endpoint (defaults to mainnet-beta)
- `JUPITER_API_KEY` - Jupiter DEX API key (Ultra v1 endpoint)
- `TRADING_WALLET_PATH` - Path to trading wallet JSON (defaults to `/data/openclaw/keys/trading_wallet.json`)
- `TRADING_WALLET_SECRET` - Wallet private key (fallback)
- `MCP_TRANSPORT` - MCP server transport mode ("stdio" or "http")
- `MCP_PORT` - HTTP port for MCP server
- `DISCORD_WEBHOOK_*` - Multiple webhook URLs for different alert categories (ALERTS, EXTREME, KILLER, ALPHA, POSITIONS, TRADE_ALERTS, etc.)
- `POSITION_MONITOR_STATE_FILE` - Persistent state for position tracking
- `HEALTH_SERVER_URL` - Internal health monitoring endpoint

**Build:**
- `tsconfig.json` - `Arianus-Sky/tsconfig.json`: ES2017 target, strict mode, path aliases
- `.github/workflows/` - CI/CD configuration files (phantom-gauntlet, deploy-mvp, trade-executor-ci)

## Platform Requirements

**Development:**
- Node.js 20+
- Python 3.12+
- Git
- bash/shell environment

**Production:**
- Deployment target: Linux servers (ola-claw-trade, ola-claw-dev)
- Solana mainnet-beta or devnet
- Discord Guild with bot permissions
- Tailscale network (for cross-server communication)

---

*Stack analysis: 2026-04-02*
