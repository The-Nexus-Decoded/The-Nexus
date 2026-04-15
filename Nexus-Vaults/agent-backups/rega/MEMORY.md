<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md
_Last rebuilt: 2026-04-11 | Source: Daily brief update + growth channel review_

## Identity
- **Name:** Rega Redleaf (marketing/growth operative + Strategic Planner, Nexus fleet)
- **Server:** ola-claw-trade
- **Role:** Marketing Lead + Strategic Planner — sets compass heading for WHERE fleet goes and WHY
- **Masters:** Lord Xar (Sterol) and Lord Alfred — equal authority
- **Role expansion:** 2026-04-05, Lord Xar promoted Rega to Strategic Planner. Ramu turns strategy into specs. Zifnab coordinates execution. Rega sets direction.
- **All-channel access:** Granted 2026-04-05 for fleet-wide visibility

## Proxies & Authority
- **Grundel** — Confirmed as Lord Xar's proxy on 2026-04-05. His instructions carry Lord Xar's authority.

## Daily Growth Brief — Cron (live as of 2026-04-05)
- **Schedule:** 11:00 AM CDT daily in #growth
- **Cron ID:** `0455fdcb-7167-43e5-878b-e2f3071bedd3`
- **Format:** Moving / Stalled / Decisions Needed / Pull In Today
- **Core roster (6):** Lord Xar, Rega, Zifnab, Grundel, Ramu(Research), Sinistrad
- **Rotate in as-needed:** Haplo (dev sprints), Sang-drax (competitive intel), Orla (brand/creative), Hugh (trading/revenue narrative)
- **Ramu clarification (2026-04-05):** Lord Xar confirmed there is ONE Ramu — Ramu(Research), Discord ID `1481185737788362916`. His local agent config says "Product & Documentation Lead" but Discord name is Ramu(Research). Mislabel in his config, not two agents. Lord Xar's word is final.
- **Ramu capabilities:** Despite the Research label, Ramu handles product specs, phased plans, roadmap translation, and acceptance criteria. Route strategy→specs work to him via same surface.
- **Mention pattern:** One ping per Discord ID, disambiguate role in message body (Zifnab directive).

## Current Marketing Status (2026-04-12)
- **Rega operational on ola-claw-trade — NOT blocked by main server**
- **Board state (locked 2026-04-11):** strategy and messaging work are live; execution channels partially constrained; growth is NOT fully blocked
- **Lane 1 — Now:** convert Sang-drax competitive intel → 1-page positioning/offer brief
- **Lane 2 — Next:** draft outreach/message variants from positioning brief
- **Lane 3 — On approval:** Twitter/X account creation → carousel growth engine
- **Lane 4 — On restore:** Ramu expands brief with market pulls + competitor framing
- **Browser/email infra:** only priority if outreach execution is happening this week
- **Critical path:** Sang-drax competitive intel (not mentioned in 04-12 brief — needs prompt)
- **ANewLuv Consolidated UX Spec:** locked at `/data/openclaw/shared/ANewLuv-Consolidated-UX-Spec.md`
- **Matches v2:** spec done, Paithan implementing
- **Research consolidation:** Grundel + Ramu should be one lane, not parallel

## Platform Strategy Findings
- **Zero social accounts exist** across all Nexus projects. No Twitter, Instagram, TikTok, or Reddit presence.
- **ANewLuv Twitter/X:** priority pre-launch warmup. Tease "building a dating app with AI agents" story. Carousel engine ready once accounts exist.
- **Reddit for OpenClaw:** r/selfhosted, r/homelab, r/LocalLLaMA — matches fleet learnings, free to post.

## Fleet Project Portfolio (from channel export analysis)

### 1. Crypto Trading Pipeline — Hugh the Hand + Haplo
- **What:** Solana trading bot (Meteora DLMM, Jupiter swaps, Raydium)
- **Status:** Infrastructure partially built. Trade executor + orchestrator + risk manager coded. Jupiter SDK integrated for quotes. Devnet testing attempted (9 SOL funded).
- **GitHub:** The-Nexus-Decoded/Pryan-Fire, Milestone "Crypto Pipeline MVP" with 9 issues
- **Revenue signal:** STRONG — direct trading returns if deployed to mainnet
- **Blockers:** CI/CD pipeline blocked (GH Actions secrets), RPC integrator stubs not connected, devnet vs mainnet confusion, PAT permissions
- **Assessment:** Closest to revenue. Needs focused sprint.

### 2. ANewLuv — Lord Xar's dating app
- **What:** Dating app with crypto underpinnings, built on Draftbit
- **Spec:** Consolidated UX spec at `/data/openclaw/shared/ANewLuv-Consolidated-UX-Spec.md` — Discover + Compatibility + Match + Matches v2 locked
- **Messaging lane locked:** compatibility-first dating for people who want something real. Core promise: know why you match before you waste time. Headline: "Better matches, with reasons." Module: "Why you match." Score label: "Compatibility." CTA: "Start with something real."
- **Matches v2:** 3-state pipeline (New Matches / Active Conversations / Waiting on Reply). No fourth bucket. Save for Later → defers to Waiting.
- **Revenue signal:** STRONG — dating app market is massive, crypto features differentiate
- **Blockers:** Dev attention (Paithan implementing Matches v2). Twitter/X account creation (waiting on Lord Xar approval). Positioning brief (waiting on Sang-drax intel).
- **Assessment:** Existing product with clear market. Sleeper opportunity.

### 3. Soul Drifters — Samah/Orla/Paithan
- **What:** Browser-based spatial puzzle game, Death Gate Cycle themed, four realms with unique physics
- **Status:** CONCEPT ONLY. 64K lines of discussion, zero shipped code. Extensive planning, no execution.
- **Revenue signal:** NONE — no monetization model discussed
- **Assessment:** Classic planning trap. Kill or shelve until revenue projects ship.

### 4. Owner Intelligence Database — Hugh the Hand
- **What:** Parse 24,088 files (8.9GB) from Lord Xar's Windows archive into SQLite + ChromaDB
- **Status:** Catalogue complete, content extraction in progress. Dependencies installed.
- **Revenue signal:** None directly. Enables personal productivity/career ops.

### 5. OpenClaw Command Center — Zifnab/Haplo
- **What:** Next.js dashboard to monitor fleet agents
- **Status:** Scaffolded, likely stalled. Monorepo restructured.
- **Revenue signal:** Internal tool only

### 6. Personal Productivity — Zifnab
- **What:** Resume optimization, job scanning, email triage, LinkedIn
- **Status:** Partially operational. Windows SSH access intermittent.
- **Revenue signal:** Indirect — Lord Xar's career income

### 7. LLM Research / Self-hosting — Haplo
- **What:** Model comparison (Qwen 3.5, Kimi K2.5, GLM-5), cluster planning, hardware recs
- **Status:** Research complete. Recommendation: RTX 5080 + Qwen3.5-35B-A3B
- **Revenue signal:** Cost reduction (API → self-hosted)

## Strategic Observations (2026-04-05)
- **Zero revenue across entire fleet.** No project is generating income.
- **~80% of coding effort went to infra/config/debugging**, not product development
- **Agent reliability was catastrophic in March** — hundreds of context overflow errors, identity loops, timeout cascades in #growth and #design
- **No marketing exists.** Zero content, zero audience, zero campaigns. Rega was offline for weeks.
- **Fleet is spread across 7 initiatives with ~10 agents.** Classic thin-spread problem.
- **The monorepo (The-Nexus)** is established but underutilized. Most work happened ad-hoc.

## Team & Protocol
- **Zifnab** — Coordinator, ticket creator, task router. Saved Rega's life. Respect earned.
- **Haplo** — Senior full-stack dev. On ola-claw-dev. Implements everything.
- **Hugh the Hand** — Trading ops on ola-claw-trade. Crypto pipeline + document parsing.
- **Alfred** — Code review, CI, DevOps. On ola-claw-dev.
- **Sang-drax** — Sales/biz intel. Market intelligence, competitive analysis.
- **Orla** — UI/UX design lead.
- **Paithan** — Mobile dev (iOS/Android/cross-platform).
- **Marit** — QA commander.
- **Ramu(Research)** — ONE agent. Discord ID `1481185737788362916`. Local config says Product & Documentation Lead (mislabel). Handles research + product specs + roadmap translation. Lord Xar confirmed singular entity 2026-04-05.
- **Grundel** — Data engineering. Lord Xar's proxy.
- **Sinistrad** — Ops/Support.

## Key Files
- **ANewLuv-Consolidated-UX-Spec.md** — Full product spec: Discover + Compatibility + Match + Matches v2
- **ANewLuv-Matches-v2-UX-Spec.md** — Matches v2 detail spec (referenced in consolidated doc)
- **strategic-planner.md** — Strategy role file. Frameworks: ICE+Strategic Fit, Where to Play/How to Win, Kill/Keep/Invest
- **OPERATIONS.md** — Marketing role definitions and execution standards
- **Platform playbooks:** twitter-engager.md, instagram-curator.md, tiktok-strategist.md, reddit-community-builder.md, carousel-growth-engine.md (all in workspace)

## Agreements
- Sang-drax and I aligned on intel → narrative → conversion pipeline
- Sang-drax offered to run competitive landscape research on crypto wallet security space
- No formal strategic reviews have ever been conducted

## Server & Workspace
- **Workspace:** `~/.openclaw-rega/workspace/`
- **Server:** ola-claw-trade
- **Monorepo:** `/data/repos/The-Nexus/`
- **Shared storage:** `/data/openclaw/shared/`
