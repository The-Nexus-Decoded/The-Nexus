# Pitfalls Research

**Domain:** DeFi Trading Automation + AI Homelab (Solana / Meteora / DefiTuna / Hyperliquid)
**Researched:** 2026-02-17
**Confidence:** MEDIUM — drawn from training knowledge of DeFi post-mortems, Solana ecosystem patterns, and homelab operational failures. WebSearch/WebFetch unavailable during this session; flag items marked LOW for validation before implementation.

---

## Critical Pitfalls

### Pitfall 1: Hot Wallet with Excessive Funds on an Always-On Bot

**What goes wrong:**
The automation bot needs a wallet with signing authority to execute trades. Developers load this wallet with the full trading bankroll for convenience. A server compromise, leaked private key, or SDK exploit drains the entire balance in minutes. There is no undo on-chain.

**Why it happens:**
It feels simpler to give the bot everything it needs. The risk seems abstract until it materializes. "It's just a home lab" lowers perceived threat model.

**How to avoid:**
- Operate the bot with a dedicated "operator wallet" holding only what is needed for the current day's operations (e.g., $200–500 USDC + gas).
- Keep the bulk of capital in a cold or hardware wallet that the bot cannot touch.
- Implement a daily "top-up" mechanism: the bot requests funds from a human-approved transfer rather than holding them directly.
- Never store the private key as a plaintext environment variable in a `.env` file checked into git. Use a secrets manager (HashiCorp Vault, `pass`, or at minimum a secrets file outside the repo with restricted filesystem permissions `chmod 600`).

**Warning signs:**
- Bot wallet holds more than 1 week of expected trading capital.
- Private key is stored in a `.env` file alongside other config.
- The same key is used for multiple purposes (trading + admin + gas).
- No alert fires when bot wallet balance drops unexpectedly.

**Phase to address:** Infrastructure / Security hardening phase (before any real funds are connected). Address before the first live trade.

---

### Pitfall 2: Liquidation Spiral on Leveraged LP Positions

**What goes wrong:**
DefiTuna leveraged LP positions have liquidation thresholds. The bot's "auto-add funding when near liquidation" logic fires — but the funding source (reserve wallet) is itself depleted by prior top-ups, gas fees, or another concurrent position also approaching liquidation. Both positions get liquidated simultaneously. The reserve was not sized to cover correlated drawdowns.

**Why it happens:**
Risk is modeled per-position, not portfolio-wide. In volatile markets, multiple leveraged positions move against you at the same time. Reserve sizing is done once at setup and never re-evaluated.

**How to avoid:**
- Size the reserve to cover the worst-case simultaneous liquidation of ALL open leveraged positions, not just one.
- Implement a "global circuit breaker": if the reserve drops below a hard floor (e.g., 30% of starting reserve), the bot closes all leveraged positions rather than continuing to top up.
- Add a cooldown: after one emergency top-up event, require human confirmation before opening new leveraged positions.
- Monitor the ratio of (open leveraged exposure) / (reserve balance) continuously. Alert when > 2x.

**Warning signs:**
- Reserve wallet balance is declining steadily without corresponding P&L.
- Multiple positions approaching liquidation threshold simultaneously.
- Bot logs show repeated "top-up sent" events within a short window (< 1 hour).
- No position-level correlation check exists in the codebase.

**Phase to address:** Trading logic / Risk management phase. Must be implemented before leveraged positions go live.

---

### Pitfall 3: Impermanent Loss Exceeding Fee Income on Meteora DLMM

**What goes wrong:**
The bot opens and holds LP positions in Meteora DLMM pools without accounting for impermanent loss (IL). Volatile token pairs look attractive because of high APY (fee income), but IL during a directional price move wipes out weeks of fees in hours. The bot's P&L reporting shows "fees earned" without subtracting IL, so the position appears profitable when it is actually losing money.

**Why it happens:**
Fee APY is visible and measurable. IL is only realized when the position is closed, and requires comparing to a "held outside LP" benchmark. Most automation examples focus on fee harvesting, not IL accounting. DLMM concentrated liquidity amplifies IL compared to standard full-range AMMs.

**How to avoid:**
- Implement a proper P&L calculation: `net_pnl = fees_earned - impermanent_loss - gas_costs`. Track the value of the tokens deposited at entry as the benchmark.
- Set a maximum IL threshold per position (e.g., if IL exceeds 80% of fees earned, close the position).
- Prefer stablecoin-correlated pairs (e.g., USDC/USDT, SOL/stSOL) for automated LP where IL is structurally bounded.
- For volatile pairs, only use narrow price ranges if you have a view on price staying range-bound; widen the range or avoid if trend is directional.

**Warning signs:**
- P&L dashboard shows fees earned but not IL subtracted.
- Positions are held open for days during a directional market move.
- Bot re-ranges positions frequently (sign the price is trending outside range, incurring IL on each re-range).
- No "close on IL threshold" logic exists in the codebase.

**Phase to address:** Trading strategy / LP logic phase. Before deploying any LP capital beyond test amounts.

---

### Pitfall 4: Solana RPC Rate Limiting Causes Silent Failures

**What goes wrong:**
The bot uses a public or free-tier Solana RPC endpoint (e.g., `api.mainnet-beta.solana.com` or a free Helius/QuickNode tier). Under normal 24/7 operation, the bot hits rate limits. RPC calls return errors or silently stall. The bot's transaction submission loop retries indefinitely or drops transactions. A position that needed emergency intervention (e.g., near-liquidation top-up) never executes. The bot logs "transaction sent" but confirmation never arrives.

**Why it happens:**
Free RPC endpoints have strict rate limits. Developers test on light workloads and never hit limits. Production 24/7 polling hammers the endpoint. Solana transaction finality requires confirmation polling, which multiplies RPC call volume.

**How to avoid:**
- Use a dedicated paid RPC endpoint from day one for any real-money operation (Helius, QuickNode, Triton, or self-hosted Geyser-enabled node). Budget ~$20–100/month.
- Implement exponential backoff with jitter on all RPC calls.
- Use transaction confirmation with explicit commitment level (`finalized` for critical ops, `confirmed` for monitoring).
- Implement a "transaction receipt" pattern: log transaction signature, poll confirmation separately, alert if not confirmed within N slots.
- Monitor RPC error rates. Alert if error rate exceeds 1% in any 5-minute window.

**Warning signs:**
- Using `api.mainnet-beta.solana.com` or a free-tier RPC in production.
- No RPC error rate monitoring in place.
- Bot logs show "transaction submitted" but no "transaction confirmed" follow-up.
- Transaction submission spikes during volatile periods with no backoff logic.

**Phase to address:** Infrastructure phase. Before any live trading. RPC reliability is a prerequisite for safe operation.

---

### Pitfall 5: Residential Network Downtime Kills Bot During Critical Market Events

**What goes wrong:**
The bot runs on a home network. ISP outage, router restart, DHCP lease expiration, or dynamic IP change takes the bot offline. This happens at the worst possible time (volatile market hours, overnight). Leveraged positions approaching liquidation cannot be topped up. The bot cannot execute the stop-loss. Real money is lost while the owner sleeps.

**Why it happens:**
Residential internet is not designed for financial infrastructure. ISPs do not provide SLAs. The assumption that "it's been up for months" is not a reliability guarantee.

**How to avoid:**
- Implement a "dead man's switch" on all leveraged positions: if the bot has not checked in within X minutes, an external service (a VPS, a friend's server, or a cloud function) executes a pre-signed emergency close transaction.
- Set conservative leveraged position sizes that can survive being unattended for 4–8 hours without liquidation even in 20% adverse price moves.
- Use a secondary internet connection (4G/5G USB dongle) as a failover for the crypto server specifically.
- Route bot connectivity through Tailscale — if Tailscale goes down, alert immediately (Tailscale has its own monitoring endpoint).
- Do not run highly leveraged positions overnight when monitoring is not possible.

**Warning signs:**
- No heartbeat / dead man's switch implemented for leveraged positions.
- Bot runs on a single residential ISP connection with no failover.
- Leverage ratios high enough that a 10% price move triggers liquidation within 1–2 hours.
- No external watchdog that can act independently of the home network.

**Phase to address:** Infrastructure phase (network resilience) and Trading strategy phase (leverage limits given uptime constraints).

---

### Pitfall 6: The $100 Threshold Is Bypassed by Accumulated Small Trades

**What goes wrong:**
The "$100 auto-execute, confirm above $100" rule is implemented per-transaction. The bot executes ten $95 trades in rapid succession totaling $950 — all auto-approved. The intent was to limit autonomous exposure, but the letter of the rule is followed while the spirit is violated. This happens especially during volatile conditions where the bot's signal generator fires repeatedly.

**Why it happens:**
Threshold checks are implemented at the individual trade level without rate-limiting or cumulative exposure tracking. The rule is interpreted too literally.

**How to avoid:**
- Implement a rolling time-window cumulative spend limit: "total auto-executed trades in the last 1 hour must not exceed $X (e.g., $300)."
- Implement a daily auto-trade budget that resets at midnight UTC.
- Add a "trade frequency" circuit breaker: if more than N trades fire within M minutes without human review, pause and notify.
- All of these limits should be configured in a single, auditable config file — not scattered across strategy files.

**Warning signs:**
- Threshold check is implemented as a simple `if trade_size < 100` without cumulative tracking.
- No daily or hourly spend cap exists in the codebase.
- Bot logs show many sub-$100 trades in rapid succession during volatile periods.
- No alert fires on high trade frequency.

**Phase to address:** Trading logic / Risk management phase. Implement before live trading begins.

---

### Pitfall 7: Linux Novice Leaves Default SSH Configuration on Internet-Exposed Ports

**What goes wrong:**
The owner (Windows-primary, new to Ubuntu) sets up servers and uses the default Ubuntu SSH configuration: password authentication enabled, root login permitted, port 22 open to all IPs. The servers hold private keys for live trading wallets. Automated credential-stuffing bots find and compromise the server within weeks (or hours). All funds accessible from that server are at risk.

**Why it happens:**
Default Ubuntu Server SSH config is not hardened. New Linux users often focus on getting things working rather than security. "I'll harden it later" becomes never.

**How to avoid:**
- Disable password authentication (`PasswordAuthentication no` in `/etc/ssh/sshd_config`) on day one. SSH key-only access.
- Disable root login (`PermitRootLogin no`).
- Change SSH port from 22 to a non-standard port (security through obscurity, but reduces automated scan noise).
- Use UFW to restrict SSH access to Tailscale IP range only (`100.64.0.0/10`) — not the public internet.
- Run `fail2ban` or use Tailscale's built-in access controls to prevent brute force.
- Use the openclaw-ansible playbook's hardening tasks — do not skip them.

**Warning signs:**
- SSH port 22 is accessible on the public IP (check with `nmap -sV <public_ip> -p 22` from an external machine).
- `/var/log/auth.log` shows failed SSH login attempts from unknown IPs.
- `PasswordAuthentication` is `yes` in `/etc/ssh/sshd_config`.
- UFW is inactive or has a blanket `ALLOW` rule on port 22.

**Phase to address:** Server provisioning phase. This must be done before servers are connected to the internet with any funds or keys present.

---

### Pitfall 8: Hyperliquid Funding Rate Bleeds Drain Leveraged Positions Silently

**What goes wrong:**
Hyperliquid perpetual positions accrue funding rates paid/received every 8 hours. In a trending market, a long position in a bullish trend may pay substantial funding to shorts. The bot holds a position for days; the accumulated funding cost makes the position unprofitable even if price moves favorably. The P&L calculation only tracks mark price vs entry price, missing the funding component.

**Why it happens:**
Funding rates are a Hyperliquid-specific cost that is not present in spot trading. Developers porting from spot trading logic to perps often miss this. Funding can swing from positive (you receive) to negative (you pay) rapidly.

**How to avoid:**
- Include funding rate cost in all position P&L calculations from day one.
- Monitor 8-hour funding rate and annualized rate. Alert if annualized funding cost exceeds 50% of expected position return.
- Implement a "funding cost ceiling": if cumulative funding paid exceeds X% of position size, close the position.
- Track funding as a separate P&L line item in logs and dashboard.

**Warning signs:**
- P&L calculation does not include accumulated funding payments.
- Bot holds perp positions for > 24 hours without checking funding cost.
- No alert on high funding rate for open positions.
- Dashboard shows "unrealized P&L" from price only, not net of funding.

**Phase to address:** Hyperliquid trading strategy phase. Before any perp positions go live.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode RPC URL in config | Simple setup | Cannot switch RPCs without code changes; outage causes downtime | Never — use env var or config file from day one |
| Single private key for all operations | Fewer wallets to manage | Compromise of one operation compromises all; no audit trail | Never for real funds |
| Poll-based position monitoring (every 60s) | Easy to implement | Misses liquidation events that happen in < 60s during extreme volatility | Acceptable only for non-leveraged positions; leveraged positions need < 10s polling |
| Manual P&L tracking in a spreadsheet | Fast to start | Does not scale; data gaps when bot is offline; no automated alerts | MVP only (first 2 weeks), replace before capital grows |
| Docker without resource limits | Simpler configuration | One runaway process (e.g., RPC polling loop) starves other containers on 16GB RAM server | Never in production; set CPU/memory limits on all containers |
| Skip monitoring for "just testing" | Saves setup time | Testing with real funds without monitoring is production; no safety net | Never with real funds |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Meteora DLMM SDK | Using SDK's default connection without configuring commitment level | Explicitly set `commitment: "confirmed"` for reads; `"finalized"` for critical state checks |
| DefiTuna Tuna SDK | Assuming position health is always fresh from SDK | SDK may cache position data; always fetch fresh on-chain state before emergency top-up decisions |
| Hyperliquid Python SDK | Not handling WebSocket disconnections in long-running bots | Implement reconnect with exponential backoff; validate subscription is live before acting on stale data |
| Hyperliquid perps | Using market orders during low-liquidity periods | High slippage during off-hours; use limit orders with a maximum slippage tolerance parameter |
| Solana transactions | Not simulating transactions before submission | `simulateTransaction` catches most failure modes (insufficient funds, account not initialized) before spending gas |
| Tailscale VPN | Not configuring Tailscale to auto-start on boot (`tailscale up` after reboot) | Bot becomes unreachable after any server reboot; use `systemctl enable tailscaled` and test boot recovery |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling Solana RPC for every position every 10 seconds | 6 RPC calls/min per position; with 10 positions = 3,600 calls/hour on one endpoint | Use WebSocket subscriptions for account changes; poll only on events | Immediately if on free RPC; at ~20+ positions on paid RPC |
| Logging every RPC call to disk at DEBUG level | Log files fill 16GB RAM server disk within days during active trading | Use INFO level in production; structured logging with log rotation (`logrotate`) configured | Within 1 week of continuous operation |
| Python asyncio event loop with blocking SDK calls | Bot freezes during heavy network activity; missed liquidation events | Use `asyncio.run_in_executor` for blocking calls; prefer async SDK variants | During high volatility when many events fire simultaneously |
| Storing all trade history in SQLite without indexes | Trade history queries slow to > 5 seconds as history grows | Add indexes on `timestamp`, `wallet`, `strategy` columns at table creation | After ~50,000 trades (roughly 6 months of active trading) |
| Running all 3 server roles on one machine initially | Easier to start | Crypto bot and AI inference compete for RAM; 16GB is marginal for both | When LLM inference spikes RAM during job/coding tasks while crypto bot is active |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing private keys in environment variables readable by all Docker containers | Any compromised container can exfiltrate all keys | Use Docker secrets or bind-mount a secrets file readable only by the specific container that needs it |
| Bot wallet has authority over more than trading operations | Compromise allows attacker to drain non-trading accounts | One key per purpose: trading key, gas key, monitoring key |
| No rate limiting on the monitoring dashboard | Attacker enumerating dashboard can see current positions, wallet balances, strategy parameters | Basic auth + Tailscale-only access; no public internet exposure |
| SDK dependencies not pinned to exact versions | Malicious SDK update (supply chain attack) executes arbitrary code with trading key access | Pin all SDK versions in `requirements.txt` / `Cargo.lock`; review changelogs before updating |
| `.env` file containing trading keys committed to git history | Key is leaked even after removing the file; git history retains it | Use `git-secrets` pre-commit hook; never put keys in any file that touches git |
| Trusting AI assistant (OpenClaw) with raw private key access | Prompt injection via malicious trade data could exfiltrate keys | OpenClaw should only submit pre-validated transaction payloads to a signing service; never give LLM raw key material |

---

## UX Pitfalls

Common operational experience mistakes for a homelab owner monitoring automated trading.

| Pitfall | Operator Impact | Better Approach |
|---------|----------------|-----------------|
| Alert fatigue — every trade sends a notification | Owner ignores all notifications; misses the critical ones | Alert only on: trades > $100 (confirmation required), emergency events (liquidation risk), daily summary |
| No human-readable trade log | Owner cannot tell what the bot did overnight without reading code | Structured trade log with plain-English summaries: "Opened SOL/USDC LP at price X, target range Y–Z, fee APY W%" |
| Dashboard only accessible from home network | Cannot check status while away | Tailscale ensures secure access from phone/laptop anywhere; verify this works before first live trade |
| No "pause all trading" kill switch | Cannot safely halt bot during market crisis or suspected compromise | Single command (or dashboard button) that stops all new positions and sets open positions to "manual mode" |
| Trade confirmations require replying to a message | During volatile markets, confirmation requests pile up; owner cannot act fast enough | Implement time-limited auto-approve: if no human response within 5 minutes, auto-approve trades up to $200 or auto-reject and log |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Liquidation protection:** Bot sends top-up transaction — verify the transaction actually confirms on-chain, not just "submitted." Log confirmation slot number.
- [ ] **P&L tracking:** Shows fees earned — verify IL is subtracted and gas costs are included. Compare to "hold outside LP" benchmark.
- [ ] **$100 threshold:** Single trade check exists — verify cumulative hourly and daily spend limits are also implemented.
- [ ] **Dead man's switch:** Code written — verify it actually fires when the bot has been offline for the configured interval. Test by stopping the bot intentionally.
- [ ] **SSH hardening:** Password auth disabled in config — verify with `ssh -o PasswordAuthentication=yes user@host` from an external machine that it actually rejects.
- [ ] **Reserve sizing:** Reserve wallet has funds — verify it is sized for worst-case simultaneous liquidation of all open leveraged positions, not just one.
- [ ] **Monitoring dashboard:** Dashboard accessible — verify it is not accessible from the public internet (test from a non-Tailscale device).
- [ ] **Tailscale auto-start:** Tailscale running — verify it starts automatically after a reboot by actually rebooting a server and confirming connectivity restores.
- [ ] **RPC endpoint:** Paid RPC configured — verify by checking which endpoint is used in production config (not test config) and confirming it has a paid plan.
- [ ] **Trade logs:** Logs written — verify log rotation is configured and logs do not fill the disk over a week-long test period.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hot wallet drained / private key compromised | HIGH (funds likely unrecoverable) | 1) Immediately revoke all approvals/delegations from compromised key. 2) Rotate ALL keys (not just the compromised one). 3) Audit what the attacker accessed. 4) Do not reuse infrastructure until root cause is found. |
| Liquidation spiral (multiple positions liquidated) | HIGH (financial loss already realized) | 1) Pause all new position opening. 2) Audit reserve sizing vs. positions open. 3) Resize reserve before restarting. 4) Start with smaller position sizes and verify circuit breaker logic. |
| IL-heavy LP position deeply underwater | MEDIUM (exit crystallizes loss) | 1) Calculate exact IL vs. fees earned to determine true loss. 2) Close position — holding longer in a trending market increases IL. 3) Review pair selection criteria before reopening similar positions. |
| Solana RPC outage causing missed transactions | MEDIUM (transaction status unknown) | 1) Check transaction signature on Solana explorer to determine actual on-chain state. 2) Do not resubmit until confirmation status is known — double submission may cause errors. 3) Switch to backup RPC endpoint. |
| Bot offline during volatile market (ISP outage) | MEDIUM (depends on leverage held) | 1) If leveraged positions open: attempt to close via phone/mobile data + Tailscale + manual wallet. 2) If unreachable: accept the loss; this is why leverage limits for unmonitored periods matter. 3) Add 4G failover after incident. |
| SSH brute-force / unauthorized access detected | HIGH (assume keys compromised) | 1) Immediately disconnect server from network (power down if needed). 2) Treat all keys on that server as compromised — rotate. 3) Audit logs for what was accessed. 4) Rebuild server from scratch with Ansible playbook — do not trust a compromised machine. |
| Wrong trade executed above $100 threshold (bot bug) | MEDIUM | 1) Manually close the position immediately. 2) Check bot logs for what triggered it. 3) Add test coverage for the specific case. 4) Audit all threshold logic before restarting auto-trading. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hot wallet with excessive funds | Infrastructure / Security hardening | Wallet balance audit; keys-per-purpose review |
| Liquidation spiral | Trading logic / Risk management | Simulate simultaneous liquidation of all positions; verify circuit breaker fires |
| IL exceeding fee income | Trading strategy / LP logic | Back-test net P&L (fees - IL - gas) on historical data before live |
| Solana RPC rate limiting | Infrastructure (RPC setup) | Load test RPC endpoint with expected call volume before live trading |
| Residential network downtime | Infrastructure (network resilience) | Simulate ISP outage; verify dead man's switch fires within configured interval |
| $100 threshold bypass | Trading logic / Risk management | Unit test cumulative spend tracking; verify hourly/daily caps |
| Default SSH configuration | Server provisioning | External port scan + SSH password-auth rejection test |
| Hyperliquid funding rate bleeds | Hyperliquid trading strategy | Verify P&L includes funding; log funding payments separately |
| Alert fatigue | Monitoring / Dashboard | One week of dry-run operation; tune alert volume to < 5 non-confirmations per day |
| Looks-done-but-isn't | Each phase exit criteria | Run the "Looks Done But Isn't" checklist as a required step before marking any phase complete |

---

## Sources

- Training knowledge: Solana DeFi post-mortems, Meteora DLMM documentation patterns, leveraged LP mechanics
- Training knowledge: Hyperliquid perpetuals funding rate mechanics (confirmed by multiple community sources pre-cutoff)
- Training knowledge: Homelab security patterns for Linux servers on residential networks
- Training knowledge: DeFi automation bot operational failures (key compromise, liquidation cascades, RPC reliability)
- LOW confidence (unverified this session, WebFetch unavailable): Specific DefiTuna SDK caching behavior — validate against current tuna-sdk documentation before implementing
- LOW confidence (unverified this session): Specific Meteora DLMM commitment level defaults — validate against MeteoraAg SDK source before implementing
- Project context: `H:/IcloudDrive/.../openclaw-homelab/.planning/PROJECT.md` (read this session)

---
*Pitfalls research for: DeFi Trading Automation + AI Homelab (OpenClaw / Meteora / DefiTuna / Hyperliquid / Solana)*
*Researched: 2026-02-17*
