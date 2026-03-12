# Solana Trading Notes

## Helius API
- Free tier key: in vault/secrets.yml (DO NOT store in memory)
- Free tier: 10 RPS, 1M credits/month
- **DO NOT use free tier for mainnet trading** — missing staked positions, other data gaps
- Chelestra-Sea #59: acquire paid Helius plan before going live
- Paid tiers: Developer $49/mo (10M credits, 50 RPS), Business $199/mo

## Known Wallets
- Bot wallet (trading): `74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x` — SOL ~0.046, USDC ~$0.17 (2 test trades landed)
- Owner wallet: `sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb`
- Wallet 2: `HZP3wFQd7nUu1V1WLXG9tau681qz165YVtrYhePDmqVW`

## Jupiter Trade Execution (WORKING — Chelestra-Sea #77)
- **Signing**: `VersionedTransaction(msg, [self.wallet])` — manual sign_message+populate is BROKEN (SignatureFailure)
- **RPC**: Helius (`mainnet.helius-rpc.com`) via HELIUS_API_KEY env var. Public RPC drops 100% of txs.
- **Confirmation**: `_confirm_transaction()` polls `get_signature_statuses` every 2s for 30s
- **Preflight**: `skip_preflight=True` (Jupiter already simulates)
- **Slippage**: 50 bps default in `_fetch_quote`
- **Hugh env.conf**: JUPITER_API_KEY + HELIUS_API_KEY
- **PRs**: #174 (confirmation), #175 (Helius), #177 (signing fix), #179 (enum fix)

## Solana Wallet Analyzer
- **Location**: `Pryan-Fire/tools/solana-wallet-analyzer/` (NOT openclaw-homelab — that's infra only)
- **Deployed to Hugh**: `/data/openclaw/workspace/Pryan-Fire/tools/solana-wallet-analyzer/`
- **Belongs to Hugh** — his tool, his cron, his data. Haplo handles CI/CD.
- 5 scripts: pull → categorize → reconstruct positions → reports → pipeline orchestrator
- Uses Helius Enhanced Transactions API with checkpointing + atomic writes
- `--max-pages N` flag for quick testing
- Protocols: Jupiter (v2-v6), Meteora DLMM, Orca Whirlpool
- Prices: SOL-denominated from swap amounts (no USD yet)
- Output: per-wallet CSVs + combined, positions, behavioral analysis
- Integration tested 2026-03-02: 6 bugs found+fixed, passes end-to-end
- Chelestra-Sea #62

## patryn-trader (LIVE on Hugh — MICRO-LIVE mode)
- Service: `systemctl --user status patryn-trader` on Hugh
- Mode: $0.01 trades, $1 max cap, mainnet, Pump.fun + Meteora scanners
- **Two-layer defense**: Layer 1 = CombinedRunner momentum check (scanner level), Layer 2 = TokenFilter (orchestrator level, Jupiter quote validation + rate limiting)
- TokenFilter committed e4667ea — survives git pulls
- Assassin's Ledger live (Haplo PR #187, 46a9ca5) — DB enriched with entry_price, exit_price, rejection_reason, route, tx_signature, slippage_bps, fee_lamports, executed_at
- Env conf: `~/.config/systemd/user/patryn-trader.service.d/env.conf` (FILTER_* vars + DISCORD_TRADE_ALERTS_WEBHOOK)
- Discord feed: `#hands-kill-feed` (1478255757492228149), webhook wired to broadcaster
- Wallet separation needed: Jupiter trading vs Meteora LP (blast radius containment)
- **Feed gaps FIXED 2026-03-03**: Scanner rejections now broadcast, balance alerts working, "No pairs" silently dropped
- **BROKEN BY DESIGN**: Pump.fun scanner checks DEX Screener immediately at launch — tokens haven't bonded yet, 100% return "No pairs found". Need delay queue (3-5 min hold before checking). Example: "Butthole" token dropped by scanner, went to $30M.
- **Next: Smart scanner pipeline** — #1 priority fix for patryn-trader. Design notes from owner:

## Scanner Pipeline Rules (Full Spec — 2026-03-03)

### LIVE Rules
| # | Layer | Rule | Env Var | Default |
|---|-------|------|---------|---------|
| 1 | L1-Leash | Min liquidity USD | LEASH_MIN_LIQUIDITY | $10,000 |
| 2 | L1-Leash | Buy/sell ratio anti-wash | LEASH_BUY_RATIO_MIN/MAX | 0.05-0.95 |
| 3 | L1-Leash | Min FDV | LEASH_MIN_FDV | $10,000 |
| 4 | L2-Filter | Master toggle | FILTER_ENABLED | true |
| 5 | L2-Filter | Min liquidity | FILTER_MIN_LIQUIDITY | $5,000 |
| 6 | L2-Filter | Max liquidity | FILTER_MAX_LIQUIDITY | $1,000,000 |
| 7 | L2-Filter | Min 24h volume SOL | FILTER_MIN_VOLUME_SOL | 50 |
| 8 | L2-Filter | Min token age | FILTER_MIN_AGE_SECONDS | 300 |
| 9 | L2-Filter | Rate limit | FILTER_MAX_TRADES_PER_MINUTE | 2 |
| 10 | L2-Filter | Require Jupiter quote | FILTER_REQUIRE_QUOTE | true |
| 11 | L2-Filter | Max price impact | FILTER_MAX_PRICE_IMPACT_BPS | 500 |
| 12 | L3-Broadcast | Scanner rate | SCANNER_RATE_LIMIT_TOKENS | 10/min |
| 13 | L3-Broadcast | Trade rate | RATE_LIMIT_TOKENS | 5/min |

| 17 | L1.5-Enhanced | Min unique buyers/5m (scales w/ age) | LEASH_MIN_BUYERS_PER_5M | 10 |
| 24 | L1.5-Enhanced | Min 5m volume SOL | LEASH_MIN_VOL_5M_SOL | 7 |
| 25 | L1.5-Enhanced | Min 1h buyers | LEASH_MIN_BUYERS_1H | 50 |
| 28 | L1.5-Enhanced | Rugcheck (danger risks + score + liquidity) | SCAN_RUGCHECK_ENABLED | true |

### TODO Rules
| # | Layer | Rule | Env Var | Default |
|---|-------|------|---------|---------|
| 14 | L0-PreBond | Delay queue | SCAN_DELAY_SECONDS | 180 |
| 15 | L0-PreBond | Retry intervals | SCAN_RETRY_INTERVALS | 120,300,600 |
| 16 | L0-PreBond | Min trading fees SOL | SCAN_MIN_FEES_SOL | 50 |
| 18 | L0-PreBond | Linked wallet detect | SCAN_CHECK_LINKED_WALLETS | true |
| 20 | L0-PreBond | Bonding status check | SCAN_CHECK_BONDING | true |
| 21 | L0-PreBond | Pre-bonding early buy | SCAN_PREBOND_BUY_ENABLED | false |
| 26 | L1.5-Enhanced | Max age hours | LEASH_MAX_AGE_HOURS | 24 |
| 27 | L0-PreBond | Min txns per 15 min | SCAN_MIN_TXNS_15M | 100 |

### Decisions Made
- #9 bot rate limit: 1/min (conservative, raise later)
- #17 unique buyers: 10/5min scaling with age — formula: `min = 10 * (age_min / 5)`. **DEPLOYED**
- #24 min 5m volume: **7 SOL**. **DEPLOYED**
- #25 min 1h buyers: **50**. **DEPLOYED**
- #27 min txns: 100 per 15 min
- #28 rugcheck: **DEPLOYED**. Uses `/report/summary` endpoint (NOT `result=="Good"` — field doesn't exist). Filters: danger-level risks, score_normalised > 30, DEX Screener liquidity < $10K (replaced Rugcheck lpLockedPct — unreliable). Fail-open on API errors. 5-min cache. `src/signals/rugcheck.py`
- **Tickets**: #78 (kill feed/health), #83 (scanner pipeline redesign), #85 (rugcheck — CLOSED), #86 (established token support — Phase 2)
- **PYTHONUNBUFFERED=1** added to env.conf — fixes pump.fun scanner log buffering
- **Research sources**: ArXiv Feb 2026 (655K tokens), Solidus Labs, Flintr rug anatomy, Rugcheck Swagger docs

## Scanner Pipeline Design (approved 2026-03-03)
- Pre-bonding pipeline: Discover → quick check (volume, buyers, rugcheck) → early buy OR hold in queue → retry at 2/5/10 min → 3 strikes = drop
- Rugcheck DEPLOYED in current pipeline (post-bonding, after DEX Screener momentum check)
- Pre-bonding pipeline is TODO (rules #14-#21) — needs delay queue + on-chain signals
- Key files: `combined_runner.py`, `src/signals/dex_screener.py`, `src/signals/rugcheck.py`, `src/core/token_filter.py`, `src/feed/discord_broadcaster.py`

## Project Structure Rules
- **openclaw-homelab**: ONLY OpenClaw infrastructure (crons, proxy scripts, fleet config)
- **Pryan-Fire**: Trading code, tools, utilities. Has CI/CD potential.
- DO NOT put standalone tools/utilities in openclaw-homelab
