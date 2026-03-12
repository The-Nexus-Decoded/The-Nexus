# Stack Research

**Domain:** DeFi Trading Automation Homelab — Solana/Hyperliquid + Job Hunting + Coding Assistance
**Researched:** 2026-02-17
**Confidence:** MEDIUM (Context7, WebFetch, and WebSearch unavailable; findings based on training data up to Jan 2025 — version numbers flagged for verification)

---

## Research Method Note

Context7 MCP, WebFetch, and WebSearch tools were unavailable during this research session. All findings derive from training data (knowledge cutoff: January 2025). Version numbers should be verified against official sources before implementation:

- Meteora SDK: https://github.com/MeteoraAg
- DefiTuna tuna-sdk: https://github.com/DefiTuna/tuna-sdk
- Hyperliquid Python SDK: https://github.com/hyperliquid-dex/hyperliquid-python-sdk
- Hyperliquid Rust SDK (hypersdk): https://github.com/infinitefield/hypersdk
- Docker releases: https://docs.docker.com/engine/release-notes/
- Ansible releases: https://docs.ansible.com/ansible/latest/release_and_maintenance.html

---

## Recommended Stack

### Server Runtime Environment

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Ubuntu Server | 24.04 LTS | Host OS for all 3 servers | LTS with 5-year support, native Docker/Ansible support, best OpenClaw compatibility. 22.04 is also valid. 24.04 is the current LTS as of early 2025. | HIGH |
| Docker Engine | 26.x / 27.x | Container isolation per service | OpenClaw runs in Docker. Containers isolate crypto bot failures from other services. Docker Compose v2 is bundled. | MEDIUM — verify exact version |
| Docker Compose | v2.x (bundled with Docker Engine) | Multi-container orchestration | Replaces standalone `docker-compose` v1. Use `docker compose` (no hyphen). Bundled with Docker Engine since v23+. | MEDIUM |
| Tailscale | Latest stable | Zero-config mesh VPN | Built into openclaw-ansible. Connects all 3 servers + Windows workstation on a private network with no port forwarding. WireGuard underneath. | HIGH |
| UFW | OS default | Firewall | Managed by openclaw-ansible. Block all except Tailscale and SSH. | HIGH |

### Crypto Server (Server 1) — Python / TypeScript

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Python | 3.11 or 3.12 | Hyperliquid SDK runtime | Hyperliquid Python SDK targets Python 3.x. 3.11+ has significant performance improvements. Use pyenv or system python in Docker. | HIGH |
| hyperliquid-python-sdk | Latest (PyPI) | Hyperliquid spot + perp trading | Official SDK from hyperliquid-dex. Covers REST and WebSocket. Handles order placement, account management, market data. | MEDIUM — verify version on PyPI |
| Node.js | 20 LTS or 22 LTS | Meteora / DefiTuna TypeScript SDK runtime | Meteora and DefiTuna SDKs are TypeScript/JavaScript. Node 20 LTS is current recommended for production. Node 22 became LTS in October 2024. | HIGH |
| TypeScript | 5.x | Type-safe bot code | Used by Meteora SDK internals. Write bot logic in TypeScript for type safety against SDK types. | HIGH |
| @meteora-ag/dlmm | Latest (npm) | Meteora DLMM pool interaction | MeteoraAg's Dynamic Liquidity Market Maker SDK. Primary SDK for LP position management, fee farming, bin management. | MEDIUM — verify package name and version |
| tuna-sdk (DefiTuna) | Latest (npm/GitHub) | DefiTuna leveraged LP positions | Official SDK for opening/managing leveraged LP positions, liquidation threshold monitoring. Published to npm or installed via GitHub. | LOW — verify package name; SDK may be private/internal |
| @solana/web3.js | 1.x or 2.x | Solana RPC calls, wallet management | Both Meteora and DefiTuna are built on Solana. Required as a peer dependency. v2 (new architecture) is in progress — check SDK peer requirements. | MEDIUM — verify which version Meteora requires |
| @coral-xyz/anchor | 0.29.x or 0.30.x | Anchor framework for program interaction | Both Meteora and DefiTuna use Anchor programs. Required as a peer dependency. | MEDIUM — verify version |

### Crypto Server (Server 1) — Rust (Optional, Hyperliquid)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Rust | 1.77+ (stable) | Runtime for hypersdk | hypersdk (infinitefield/hypersdk) is a Rust client for Hyperliquid. Use if latency-sensitive order execution is required. | MEDIUM |
| hypersdk (infinitefield) | Latest (GitHub/crates.io) | Rust Hyperliquid client | Alternative to Python SDK for performance-critical paths (e.g., rapid liquidation protection adds). Not official; community-maintained. | LOW — verify maintenance status; may be inactive |
| tokio | 1.x | Async runtime for Rust | Standard async runtime for all serious Rust services. hypersdk likely depends on it. | HIGH |

**Recommendation on Rust vs Python for Hyperliquid:** Start with Python SDK. Python is sufficient for the sub-second execution requirements of this homelab's trade sizes and thresholds. Only migrate hot paths to Rust if latency becomes a measured problem. The Python SDK is the official, maintained path.

### Job Server (Server 2)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Python | 3.11 or 3.12 | Job scraping and AI task identification | Most scraping/AI libraries are Python-first. Consistent with Server 1. | HIGH |
| Playwright | 1.40+ | Browser automation for job scraping | Modern replacement for Selenium/Puppeteer. Headless Chromium. Handles JS-heavy sites like LinkedIn, Indeed. Supports async. | HIGH |
| httpx | 0.26+ | Async HTTP for API-based job sources | Modern async HTTP client for Python. Replaces requests for async contexts. Use for Upwork/Fiverr APIs where available. | HIGH |
| BeautifulSoup4 | 4.12+ | HTML parsing | Well-established, simple parsing for scraped content. Paired with httpx for static sites. | HIGH |
| APScheduler | 3.10+ | Cron-style job scanning schedule | Schedule scans every N hours. Simpler than Celery for this use case. No Redis/RabbitMQ required. | MEDIUM |

### Coding Server (Server 3)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| OpenClaw + MCP tools | Latest OpenClaw release | Core coding assistant runtime | This is the whole point of Server 3. MCP (Model Context Protocol) tools provide file system, git, and shell access to the AI. | HIGH |
| Language Server Protocol tooling | Per-language | Code intelligence for AI assistant | Enable the AI to use language servers for type checking, go-to-definition. Optional for MVP. | MEDIUM |

### Shared Infrastructure

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| PostgreSQL | 15 or 16 | Persistent storage for trade logs, job results | Reliable relational DB. Better than SQLite for concurrent writes from multiple services. TimescaleDB extension available for time-series trade data. | HIGH |
| TimescaleDB | 2.x (extension) | Time-series trade data | Built on PostgreSQL. Optimized for append-heavy time-series workloads (OHLCV, position history, P&L). Runs in same container as Postgres or as a separate image. | MEDIUM |
| Redis | 7.x | Job queue, real-time signal caching, pub/sub | Lightweight, fast. Use for: trade signal queue, deduplicating job scan results, rate-limit state for APIs. | HIGH |
| Prometheus | 2.x | Metrics collection | Pull-based metrics from all services. Runs on one server, scrapes all others via Tailscale. | HIGH |
| Grafana | 10.x or 11.x | Dashboard + alerting | Visualization layer for Prometheus metrics. Also supports PostgreSQL/TimescaleDB as a datasource directly. Accessible via Tailscale only. | HIGH |
| Alertmanager | 0.26+ | Alert routing | Routes Prometheus alerts to notification channels (Telegram/Discord/email). Use for liquidation threshold alerts and job match notifications. | MEDIUM |
| Loki | 2.x or 3.x | Log aggregation | Grafana-native log aggregation. Collects logs from all Docker containers via Promtail. Keeps logs searchable without Elasticsearch overhead. | MEDIUM |
| Promtail | Same as Loki | Log shipper | Ships Docker container logs to Loki. Runs as a container on each server. | MEDIUM |

### Notification / Alert Delivery

| Technology | Purpose | Why Recommended | Confidence |
|------------|---------|-----------------|------------|
| Telegram Bot API | Trade confirmations, alerts, job matches | Free, reliable, excellent Python library (python-telegram-bot). Works well for threshold confirmations (over $100 trades need manual approval). | HIGH |
| python-telegram-bot | 20.x | Python wrapper for Telegram Bot API | Async-native in v20+. Industry standard for Telegram bots. | HIGH |
| Discord Webhooks (optional) | Alternative notification channel | Simpler than full bot for one-way alerts, but Telegram is better for interactive confirmations (approve/reject). | MEDIUM |

### Deployment / IaC

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Ansible | 9.x / core 2.16+ | Server provisioning and app deployment | Already chosen (openclaw-ansible). Agentless SSH-based automation. Perfect for Windows-primary owner who needs repeatable Linux setup. | HIGH |
| Git | System (2.40+) | Configuration and code sync | Replaces iCloud sync for Linux. All playbooks, bot configs, and secrets templates live in Git. | HIGH |
| Ansible Vault | Bundled with Ansible | Secrets management | Encrypt wallet private keys, API keys at rest in the Ansible repo. Simple, no extra infra. | HIGH |
| Docker Compose | v2 (bundled) | Per-server service composition | Each server has a `docker-compose.yml` defining its services. Ansible deploys and restarts via `community.docker.docker_compose_v2` module. | HIGH |

### Security

| Technology | Purpose | Why Recommended | Confidence |
|------------|---------|-----------------|------------|
| Tailscale ACLs | Network isolation between servers | Restrict which servers can talk to which. Crypto server should not be accessible from job server. | HIGH |
| Ansible Vault | Wallet key and API key storage | Never store keys in plaintext. Vault-encrypt wallet keys and API credentials in Ansible vars. | HIGH |
| UFW (Uncomplicated Firewall) | Block all non-Tailscale inbound | Default deny inbound. Only Tailscale (UDP 41641), SSH (22 via Tailscale only) open. | HIGH |
| Docker network isolation | Per-service container networking | Each service gets its own Docker network. External traffic only via explicit port mapping or internal Docker DNS. | HIGH |

---

## What NOT to Use

| Avoid | Why | Use Instead | Confidence |
|-------|-----|-------------|------------|
| Selenium | Outdated browser automation, fragile selectors, slow | Playwright 1.40+ | HIGH |
| docker-compose v1 (standalone, Python package) | Deprecated, no longer maintained by Docker. v1 EOL'd in 2024. | Docker Compose v2 (`docker compose` no hyphen, bundled with Docker Engine) | HIGH |
| SQLite for production trade data | Single-writer limitation causes contention under concurrent bots; no native time-series | PostgreSQL 15+ with TimescaleDB | HIGH |
| Celery (for this scale) | Overkill for 3-server homelab with light task volume. Requires Broker (Redis) + Worker management overhead. | APScheduler for lightweight cron-style scheduling; Redis pub/sub for simple queuing | MEDIUM |
| @solana/web3.js v1 (if avoidable) | Solana Foundation released v2 (new architecture, tree-shakeable). However, most Solana ecosystem SDKs still target v1. Do NOT upgrade preemptively — let Meteora/DefiTuna SDK peer deps dictate which version. | Let SDK peer deps dictate | MEDIUM |
| Kubernetes (K8s) | Massive operational overhead for 3-node homelab. K8s is built for much larger clusters. Resource overhead alone (etcd, control plane) would eat 3-4GB RAM per node out of your 16GB. | Docker Compose + Ansible | HIGH |
| Elasticsearch/ELK Stack | 8+ GB RAM overhead, complex to operate. Overkill for homelab log volume. | Grafana Loki | HIGH |
| Cronitor / external monitoring SaaS | Unnecessary cost and data leakage for crypto trading system. Keep monitoring in-house. | Self-hosted Grafana + Prometheus + Alertmanager | MEDIUM |
| Hardcoded wallet private keys in source code | Catastrophic security risk. One leaked key = loss of all funds. | Ansible Vault encrypted vars; inject as Docker secrets / env vars at deploy time | HIGH |
| Running bots as root | Privilege escalation risk if container escape. | Create dedicated `openclaw` user, run containers as non-root | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Hyperliquid SDK language | Python (`hyperliquid-python-sdk`) | Rust (`hypersdk`) | Only if measured latency becomes a blocker. hypersdk maintenance status is uncertain. Start Python, migrate hot path only. |
| Notification delivery | Telegram Bot | Discord Webhook | If you already live in Discord and don't need interactive approve/reject flow. Telegram is better for confirmations. |
| Log aggregation | Grafana Loki | Elasticsearch (ELK) | Only if you need full-text search across millions of log lines and have >32GB RAM to spare. |
| Job scheduling | APScheduler | Celery + Redis | Only if job scan tasks become complex multi-step workflows needing retry logic, priority queues, and >10 concurrent workers. |
| Metrics | Prometheus + Grafana | Netdata | Netdata is simpler to set up but less flexible for custom trading metrics. Use if Prometheus feels heavyweight initially. |
| Database | PostgreSQL + TimescaleDB | InfluxDB | InfluxDB if you have no relational data needs at all. PostgreSQL + Timescale is more versatile (relational + time-series in one). |
| Secrets management | Ansible Vault | HashiCorp Vault | Use Vault only if you have >5 developers or compliance requirements. Overkill for 1-person homelab. |
| Container orchestration | Docker Compose | Podman Compose | Podman if you want rootless containers by default. Docker has better Ansible module support. |

---

## Stack Patterns by Server Role

**Server 1 (Crypto) — critical path, financial risk:**
- Run each trading system (Meteora, DefiTuna, Hyperliquid) as a separate Docker service with its own Compose file
- Use a dedicated Python virtual environment per service inside container (or separate images)
- Store all positions in PostgreSQL — never only in memory
- All liquidation-protection logic runs in-process with the bot, not as an external cron — too slow
- Telegram bot is mandatory on this server for the `>$100 confirmation` threshold
- Never share wallet keys between services — use separate funded wallets per system if possible

**Server 2 (Jobs) — lower risk, higher latency tolerance:**
- Playwright in headless mode for JS-heavy job boards
- httpx for API-based sources (Upwork has a partner API)
- PostgreSQL for deduplication (track seen job IDs)
- Redis for rate-limit state across scraping sessions
- APScheduler for periodic scan triggers

**Server 3 (Coding) — stateless AI assistant:**
- OpenClaw with MCP filesystem, git, and shell tools
- Mount coding project directories as Docker volumes
- No persistent state beyond OpenClaw's conversation/memory mechanisms
- PostgreSQL not required unless you want to log assistant interactions

---

## Version Compatibility Notes

| Package | Compatible With | Notes | Confidence |
|---------|-----------------|-------|------------|
| @meteora-ag/dlmm | @solana/web3.js 1.x | Meteora SDK is likely pinned to web3.js v1. Do not upgrade to web3.js v2 independently. | MEDIUM |
| tuna-sdk | @solana/web3.js 1.x | Same pattern — DefiTuna is Solana-based. Check package.json peer deps before installing. | MEDIUM |
| hyperliquid-python-sdk | Python 3.9+ | Likely supports 3.9–3.12. Test on 3.11 first. | MEDIUM |
| Docker Compose v2 | Docker Engine 23+ | Compose v2 is bundled. Don't install standalone docker-compose pip package. | HIGH |
| TimescaleDB 2.x | PostgreSQL 15 or 16 | TimescaleDB 2.x supports pg14-pg16. Use official TimescaleDB Docker image (`timescale/timescaledb-ha`) for simplest setup. | HIGH |
| python-telegram-bot 20.x | Python 3.8+ | v20 is async-native (asyncio). Incompatible with sync code patterns from v13. Use v20 from the start. | HIGH |
| Playwright 1.40+ | Node.js 18+ or Python 3.8+ | Use Python Playwright bindings for consistency with other Server 2 code. | HIGH |

---

## Installation Snippets

### Server 1 — Python bot (Hyperliquid)

```bash
# In Dockerfile or requirements.txt
pip install hyperliquid-python-sdk
pip install python-telegram-bot==20.*
pip install psycopg[binary]  # PostgreSQL async driver
pip install redis[hiredis]
pip install apscheduler
```

### Server 1 — TypeScript bot (Meteora / DefiTuna)

```bash
npm install @meteora-ag/dlmm
npm install @solana/web3.js
npm install @coral-xyz/anchor
# DefiTuna — verify exact package name on npm or GitHub
# npm install tuna-sdk  OR  npm install @defituna/tuna-sdk
```

### Server 2 — Job scraper

```bash
pip install playwright
playwright install chromium  # download browser binary
pip install httpx[http2]
pip install beautifulsoup4 lxml
pip install apscheduler
pip install psycopg[binary]
pip install redis[hiredis]
```

### Shared infrastructure (Docker Compose fragment)

```yaml
services:
  postgres:
    image: timescale/timescaledb-ha:pg16
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    ports:
      - "127.0.0.1:3000:3000"  # bind to localhost only; access via Tailscale
```

---

## Sources

- **Training data (Jan 2025 cutoff)** — basis for all recommendations. Confidence reflects knowledge staleness risk.
- **Verify Meteora SDK package name/version:** https://github.com/MeteoraAg
- **Verify DefiTuna SDK package name/version:** https://github.com/DefiTuna/tuna-sdk
- **Verify Hyperliquid Python SDK PyPI version:** https://github.com/hyperliquid-dex/hyperliquid-python-sdk
- **Verify hypersdk maintenance status:** https://github.com/infinitefield/hypersdk
- **Docker Engine releases:** https://docs.docker.com/engine/release-notes/
- **Ansible releases:** https://docs.ansible.com/ansible/latest/release_and_maintenance.html
- **TimescaleDB Docker images:** https://hub.docker.com/r/timescale/timescaledb-ha
- **python-telegram-bot docs:** https://docs.python-telegram-bot.org/en/stable/

---

## Confidence Summary

| Area | Confidence | Reason |
|------|------------|--------|
| Ubuntu + Docker + Tailscale + Ansible | HIGH | Stable, well-established tooling. No significant changes expected. |
| Hyperliquid Python SDK | MEDIUM | SDK exists and is well-known; exact current version unverified. |
| Meteora SDK package name/version | MEDIUM | SDK exists; npm package name needs GitHub/npm verification. |
| DefiTuna tuna-sdk | LOW | Less publicly documented; package name and availability unconfirmed without live lookup. |
| hypersdk (Rust) | LOW | Community-maintained alternative; maintenance status unverified. |
| PostgreSQL + TimescaleDB | HIGH | Extremely stable. Version compatibility well-documented. |
| Redis, Prometheus, Grafana | HIGH | Industry standard monitoring stack. Versions stable. |
| Telegram notification stack | HIGH | python-telegram-bot v20 is well-documented; API is stable. |
| Playwright for job scraping | HIGH | Playwright is the clear modern standard for browser automation. |
| @solana/web3.js version decision | MEDIUM | v1 vs v2 migration is active in the ecosystem; need to check SDK peer deps. |

---

*Stack research for: OpenClaw Homelab — DeFi Trading Automation + Job Hunting + Coding Assistance*
*Researched: 2026-02-17*
*Note: Verify all version numbers against official sources before implementation. Context7, WebFetch, and WebSearch were unavailable during this research session.*
