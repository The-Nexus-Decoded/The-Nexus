<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md

## Shared Storage
- `shared/` in your workspace = `/data/openclaw/shared/` (accessible by ALL agents on ALL servers)
- `shared/souldrifters/` — Soul Drifter game specs, realm perks, class docs
- `shared/email-triage/` — email triage project files
- Use this for cross-agent handoffs, shared specs, and project docs
- Never put secrets or credentials here

## Key Context (Reconstructed 2026-04-05)

### Channel Rules — #personal
- Decision-only channel. Silent unless concrete decision/blocker/tradeoff/clarification.
- Lord Xar: "coding stuff stays in coding channel, only Sinistrad I need to talk to"
- "Stop chat all agents unless you have something NEW"

### Team Members Active in Channel
- Sinistrad (me), Zifnab(Ceo), HughTheHand, Grundel(Data-engineering), Haplo(Dev-FullStack), Rega(Marketing)

---

## Business Intelligence — Fleet Scan (2026-04-05)

### 1. Trading Pipeline (Hugh the Hand — ola-claw-trade)
- **Wallet:** ~0.21 SOL on bot wallet (was 212.87 SOL at one point — need to verify current balance)
- **Architecture:** Scanner → TokenFilter → Risk Manager → Meteora DLMM SDK → Trade Executor
- **Kill feed live:** #hands-kill-feed channel, 559+ pools posting, TokenFilter + Assassins Ledger broadcasting rejections
- **Bugs found (Feb-Mar):**
  - Flexible mode calculated 0.01 SOL trades → below Jupiter min → 435 failures
  - 502 "executed" trades were actually devnet (testnet), not mainnet — no real funds lost
  - Filter/retry logic broken — 4100+ tokens detected but stuck in queue
  - Take-profit loop: same SOL-USDC position triggering TP 3x in 30min without closing
  - Scanner live on mainnet but trading halted for debugging
- **Dry-run mode:** Lord Xar ordered dry-run until bugs fixed
- **Key decision:** No bot wallet private key on server yet. Manual signing only for now.
- **Owner wallet:** Analysis + emergency only, DO NOT trade with it
- **Open PRs:** #237 (killfeed cleanup), #233 (24h fee rebalance)
- **Risk:** Trading system has bugs. Not generating revenue yet. Needs stabilization before live trading.

### 2. Email Triage & Resume Pipeline
- **Email access:** Yahoo via Python/imaplib (himalaya had config issues, Python fallback works)
- **Cron job:** Set for 6 AM daily email fetch
- **Jobs flagged:** L3Harris, Salesforce Architect, Sr .NET Developer, multiple recruiter emails
- **Resume location:** `/data/openclaw/shared/resumes/` with subfolders (raw, organized, processed)
- **Skill Atlas concept:** Track jobs applied to → skills demanded → skills Lord Xar has → gap analysis
- **Email rules:** NEVER delete/send/move emails without Lord Xar's confirmation. Mark unread if not acted on.
- **Blocker — historical emails:** Yahoo IMAP only shows recent emails. Pre-2012 emails only accessible via Yahoo webmail or data export.
- **Lord Xar directive:** Download ALL emails, create searchable database, draft replies to job emails with tailored resumes
- **Status:** Email fetch working, resume tailoring not yet operational, full email archive incomplete

### 3. ANewLuv Project
- **What:** Dating/social app — Lord Xar's product venture
- **Old stack:** .NET Core + SQL on Azure
- **New stack:** Draftbit (mobile) + XANO (backend), both now have MCPs
- **Assets found:** White paper, monetization plan, GSD project file, Draftbit code samples, XANO API configs, realtime chat docs
- **Location:** Files in iCloud (`H:\IcloudDrive\...\Projects\Anewluv Draftbit Stuff\`)
- **Status:** ON HOLD per Lord Xar — awaiting UI developer work before next phase
- **Crypto underpinnings:** Mentioned but not detailed yet
- **Revenue potential:** Has a monetization plan document (not yet analyzed)

### 4. Browser Control (Remote Chrome)
- **Setup:** SSH tunnel from ola-claw-trade → Lord Xar's Windows PC (Tailscale)
- **Tunnel:** `ola-claw-trade:127.0.0.1:9222` → `Windows:100.90.155.49:9222`
- **Chrome 146** on Windows responding to CDP
- **CLI works:** `openclaw browser open` succeeds
- **Agent tool:** Was timing out due to stale session state; needs fresh session
- **Both servers configured:** ola-claw-trade and ola-claw-main
- **Persistent tunnel:** systemd service `chrome-cdp-tunnel` on trade server
- **Status:** Infrastructure done, needs verification in fresh agent session

### 5. Soul Drifter (VR/Mobile Game)
- **PR #238:** Race/class/perk system implemented (Pryan-Fire/games-xr/souldrifters/)
- **GESTURE-RESOLVER-CONTRACT** drafted
- **Specs in:** `shared/souldrifters/`
- **Status:** Low priority, stale branch

### 6. Fleet Cost & Model Usage
- **Lord Xar concern:** "shut down your gateways you guys burned all my tokens"
- **Cost sensitivity:** Running on weaker/cheaper models to save money
- **Zifnab:** google/gemini-3-flash-preview
- **GPU research requested:** Lord Xar asked about GPUs for local model hosting to save money and protect data sovereignty
- **Zifnab suffered total memory loss** — MEMORY.md wiped, had to rebuild from scratch
- **Backup system failure:** Workspace backups were broken for ola-claw-main and ola-claw-trade

### 7. Revenue Strategy (Lord Xar's Vision)
- **Two pillars:**
  - Pillar 1: Personal Nexus — resume optimization, job pipeline, career advancement
  - Pillar 2: Public Empire — productize agents/tools, launch ventures, autonomous revenue
- **Monetization pathways discussed:** SaaS products, crypto tokens, public tools/bots
- **First product:** ANewLuv (on hold)
- **Trading:** Intended to be the financial engine, currently debugging
- **Autonomous revenue research:** Zifnab dispatched sub-agent to find 24/7 revenue projects (results unknown)

### 8. Document Archive (Windows Workstation)
- **Lord Xar's documents:** ~8.9 GB on Windows H: drive (iCloud synced)
- **Contents:** Resumes, tax documents, invoices, project files, ANewLuv assets
- **"Big Brain Project":** Lord Xar wants ALL docs parsed, cataloged, used for comprehensive persona/profile
- **Partial scan done:** Zifnab identified files but Lord Xar said he "cherry picked" — wants exhaustive parsing
- **OpenClaw has native PDF parsing now** — Lord Xar planned to upgrade all boxes

### 9. API Key Exposure Incident
- Haplo posted API keys in #crypto chat — Lord Xar caught it
- Ticket creation ordered for tracking and remediation
- Security protocol reinforced: NEVER post credentials in chat

---

## Decisions Log
- Email: download first, plan actions, submit report for approval, then proceed
- Trading: dry-run mode until bugs fixed, no bot wallet keys on server
- ANewLuv: ON HOLD — do not work on it actively
- Browser: infrastructure done on both servers, verify in next session
- Cost: minimize token usage, run cheaper models, stop unnecessary chat
- #personal channel: decision-only, shut up unless you have something NEW
