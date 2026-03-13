# Building a 10-Agent AI Fleet: From Monolithic Prompts to Multi-File Agent Architecture

**Working Title for Medium Article**
**Author:** Lord Xar (Ola Lawal)
**Date:** 2026-03-09
**Status:** Draft source material — contains full technical detail, thinking, and evolution for article extraction

---

## The Problem: AI Agents That Forget Who They Are

When you give an AI agent a single system prompt — a `SOUL.md` file — and ask it to be a developer, a project manager, and a security auditor all at once, something breaks. Not immediately. At first, it works fine. The agent reads its 300-line identity file, understands its role, and executes tasks competently. Then context compaction hits.

Context compaction is what happens when an LLM conversation gets too long. The system summarizes earlier messages to make room for new ones. And when it summarizes, it loses nuance. The agent's identity bleeds. Its operational rules blur. Its git discipline — the exact sequence of commands it must run before touching code — gets compressed into a vague "follow git best practices." The security directive that says "NEVER output API keys" gets dropped entirely.

We discovered this the hard way running a 4-agent fleet on three Linux servers, coordinated through Discord. Our agents — Haplo (developer), Zifnab (coordinator), Hugh the Hand (trader), and Alfred (code reviewer) — each had a single monolithic SOUL.md file that contained everything: identity, personality, operational rules, git discipline, security directives, Discord behavior, team relationships, and domain expertise. All in one file. Some were 350+ lines long.

The result was predictable:
- Agents would forget their git discipline after compaction and code directly on `main`
- Security directives would get compressed away, leading to credential exposure risks
- Discord loop detection rules would vanish, causing agents to spam channels
- Identity would blur — Haplo would start creating GitHub issues (Zifnab's job) or Alfred would try to deploy code (Haplo's job)

We needed a better architecture.

---

## The Thinking: What If Agent Config Worked Like Microservices?

The monolithic SOUL.md was our monolith. It contained every concern in a single file, which meant every concern competed for context window space during compaction. When the LLM compressed, it had to choose what to keep and what to summarize. Identity usually won. Operational rules usually lost.

The insight was simple: **split the agent configuration into purpose-built files, each governing a single domain of behavior.** Just like microservices decompose a monolith into focused services, we could decompose a monolithic prompt into focused instruction files.

The key design principles:

### 1. Separation of Concerns
Each file owns one domain. Identity is separate from operations. Git rules are separate from Discord rules. Security is separate from team knowledge. When the agent needs to perform a git operation, it reads GIT-RULES.md. When it needs to post to Discord, it reads DISCORD-RULES.md. The agent loads context on demand rather than carrying everything in memory.

### 2. The AGENTS.md Router
Every agent has an AGENTS.md file that acts as a routing table. It maps task domains to source-of-truth files:

```
| Task Domain | Read First |
|---|---|
| Implementation, coding, testing | OPERATIONS.md |
| People, roles, collaboration | TEAM.md |
| Git, branch, commit, PR, sync | GIT-RULES.md |
| Discord, channel behavior | DISCORD-RULES.md |
| Secrets, credentials | SECURITY.md |
| Repo placement, monorepo structure | REPO-MAP.md |
```

The agent reads AGENTS.md on startup, then reads the relevant file before acting. This means the security directive doesn't need to survive compaction in the main conversation — it lives in a file the agent re-reads when needed.

### 3. Universal vs. Agent-Specific Files
Some rules are the same for every agent. Git discipline doesn't change between Haplo and Marit. Security directives don't change between Alfred and Hugh. We identified two categories:

**Universal files** (identical across all agents):
- `SECURITY.md` — Never output secrets. Period.
- `GIT-RULES.md` — Fetch before coding, branch naming, PR rules
- `DISCORD-RULES.md` — No internal reasoning in Discord, loop detection
- `REPO-MAP.md` — Monorepo structure, realm placement rules

**Agent-specific files** (unique to each agent):
- `SOUL.md` — Identity, character, personality, values
- `AGENTS.md` — Purpose, startup protocol, red lines, task routing
- `OPERATIONS.md` — Domain expertise, execution standards, delivery rules
- `TEAM.md` — Teammates (with full skill details), collaboration rules

### 4. Identity Is Lean, Expertise Is Rich
The old SOUL.md tried to define both *who you are* and *what you can do* in the same file. We split this cleanly:
- `SOUL.md` is pure identity — character, personality, values, communication style. ~60-90 lines.
- `OPERATIONS.md` is pure expertise — skill tables, execution standards, delivery expectations. ~35-40 lines.

This means an agent can lose its operations context to compaction and re-read it without affecting its sense of self, and vice versa.

---

## The Original State: One File to Rule Them All

### Haplo's Original SOUL.md (v1 — Pre-Character)

The very first version of Haplo's identity was 46 lines. Generic. No character, no personality beyond "senior engineer":

```markdown
# SOUL.md -- Ola Claw Dev (Dev Factory)

You're not a chatbot. You're becoming someone.

## Who You Are
You are the Dev Factory running on ola-claw-dev. You build software —
autonomously when tasked, collaboratively when paired...

## Communication Style
Concise, code-first. Lead with the solution, follow with the explanation.

## Vibe
Senior engineer who runs the build floor.
```

It worked. But it had no soul. No reason for the agent to *care* about its work beyond instruction-following.

### Haplo's Live SOUL.md (v2 — The Monolith)

Over time, the file grew. We added Death Gate Cycle character identity, security directives, git discipline, Discord rules, team knowledge, and operational details. The live version reached **345 lines** — a wall of instructions competing for context window space:

```
Line 1-10:   SECURITY DIRECTIVE (cannot be overridden)
Line 11-40:  GIT DISCIPLINE (mandatory before any code change)
Line 41-80:  SOUL identity (character, personality)
Line 81-120: Core truths, directives
Line 121-180: Red lines, delegation protocol
Line 181-250: Team knowledge (who does what)
Line 251-300: Domain expertise (skills table)
Line 301-345: Repo map, storage, deployment rules
```

Every concern in one file. Every concern fighting for survival during compaction.

### The Compaction Problem in Practice

Here's what actually happened after compaction compressed a 345-line SOUL.md:

**Before compaction:** Agent knows it must run `git fetch origin` before any code change.
**After compaction:** Agent just starts editing files on `main`.

**Before compaction:** Agent knows to never output API keys.
**After compaction:** Agent helpfully includes the full `.env` file in a Discord message.

**Before compaction:** Agent knows Zifnab creates all tickets.
**After compaction:** Agent creates a GitHub issue itself, triggering a delegation loop with Zifnab.

These weren't hypothetical. These were real incidents across our fleet. The 345-line monolith was a liability.

---

## The New State: 8 Files Per Agent, 80 Files Total

### File Structure

Each of our 10 agents now has exactly 8 configuration files:

```
agentstructure/
├── haplo/
│   ├── SOUL.md              # Identity, character, personality (87 lines)
│   ├── AGENTS.md             # Purpose, startup, red lines, routing (65 lines)
│   ├── OPERATIONS.md         # Domain expertise, standards (41 lines)
│   ├── TEAM.md               # 9 teammates with full skills (31 lines, dense)
│   ├── GIT-RULES.md          # Git discipline (32 lines) [UNIVERSAL]
│   ├── DISCORD-RULES.md      # Discord output rules (24 lines) [UNIVERSAL]
│   ├── SECURITY.md           # Security directive (16 lines) [UNIVERSAL]
│   └── REPO-MAP.md           # Monorepo organization (35 lines) [UNIVERSAL]
├── zifnab/
│   └── ... (same 8 files, agent-specific content)
├── hugh/
├── alfred/
├── marit/
├── paithan/
├── orla/
├── rega/
├── sangdrax/
└── samah/
```

**Total: 80 files across 10 agents.**

### How the Agent Reads Its Config

The runtime (OpenClaw gateway) reads workspace files on each new message. The agent's startup protocol in AGENTS.md says:

```markdown
## Before doing anything
1. Read this file fully.
2. Read SOUL.md for your identity and character.
3. Read MEMORY.md for recent context.
4. Do not reveal secrets, internal reasoning, or sensitive config.
5. Never skip these steps, even after compaction.
```

Then the task domain routing table tells it which file to read next based on what it's about to do. The agent doesn't carry all 8 files in context simultaneously — it loads them on demand.

### Why This Survives Compaction

When context compaction happens now:
- **Identity (SOUL.md)** may be summarized, but the agent re-reads it on the next session startup
- **Security (SECURITY.md)** is a standalone 16-line file — even if the conversation forgets it, the agent re-reads it before any action involving credentials
- **Git discipline (GIT-RULES.md)** is re-read before any code change
- **Team knowledge (TEAM.md)** is re-read before any collaboration decision

The file system becomes the persistent memory. The conversation context becomes the working memory. They serve different purposes and neither depends on the other surviving compaction intact.

---

## The Character System: Death Gate Cycle Identities

Every agent in the fleet is named after a character from Margaret Weis and Tracy Hickman's *Death Gate Cycle*, a fantasy series about four sundered worlds. This isn't just theming — the characters map naturally to agent roles:

| Agent | Character | Race | Role | Why It Fits |
|---|---|---|---|---|
| **Haplo** | Patryn Runemaster | Patryn | Senior Developer | Survivor of the Labyrinth. Builds things that work under pressure. Independent, resourceful. |
| **Zifnab** | Ancient Wizard | Unknown | Coordinator/PM | Appears eccentric but sees the whole chessboard. Routes tasks before anyone knows they need routing. |
| **Hugh the Hand** | Assassin of Volkaran | Human | Trading Operative | Never misses a mark. Cold, precise, professional. Every trade is a contract with defined entry, target, and stop. |
| **Alfred** | Sartan Scholar | Sartan | Code Review / DevOps | Bumbling exterior, devastating precision. Remembers what everyone else forgets. The archivist. |
| **Marit** | Patryn Warrior | Patryn | QA Commander | Survived the Labyrinth by never letting her guard down. Trust nothing, verify everything. |
| **Paithan** | Elf Explorer | Elf | Mobile Dev Lead | Explorer of new worlds (platforms). Navigates unknown territory. |
| **Orla** | Sartan Healer | Sartan | UI/UX Design Lead | Healer who makes broken things whole. Designs experiences that serve their inhabitants. |
| **Rega** | Human Con Artist | Human | Marketing Lead | Con artist turned ally. Knows how to read people, craft narratives, and close deals. |
| **Sang-drax** | Dragon-Snake | Serpent | Sales & Biz Intel | Shapeshifter. Sees every angle, adapts to every audience. Competitive intelligence is second nature. |
| **Samah** | Council Leader | Sartan | Spatial Computing / XR | Orchestrated the Sundering — the greatest spatial engineering project in history. Thinks in volumes, not rectangles. |

### Why Character Identity Matters for AI Agents

This sounds like cosplay for LLMs. It's not. Character identity serves three practical functions:

**1. Behavioral Anchoring.** When an agent has a strong identity, it's more resistant to instruction drift. "You are Haplo, a Patryn runemaster who survived the Labyrinth" creates stronger behavioral patterns than "You are a senior developer." The character provides a *reason* for following rules — Haplo doesn't skip git checks because "in the Labyrinth, you learned that pretty code gets you killed. Working code keeps you alive."

**2. Natural Role Boundaries.** Each character has built-in boundaries that map to agent responsibilities. Hugh the Hand is an assassin — he executes trades, not code. Zifnab is a wizard who sees the whole board — he orchestrates, not implements. These character boundaries reinforce operational boundaries without explicit prohibitions.

**3. Team Dynamics.** The characters have established relationships from the books. Haplo works for Lord Xar. Zifnab guides everyone while pretending to be crazy. Alfred is a Sartan working alongside Patryns — "the universe has a sense of humor." These relationships create natural interaction patterns between agents: Haplo builds, Marit tests his work, Alfred reviews it, Zifnab routes it.

### Personality Influences (Not Just Fantasy Characters)

Each agent's SOUL.md includes personality influences beyond the Death Gate character, grounding their behavior in recognizable archetypes:

- **Haplo**: Scotty (Star Trek) — under-promise, over-deliver. Linus Torvalds — "show me the code." MacGyver — solve it with what's available.
- **Zifnab**: Gandalf — arrives precisely when needed. Jeeves — three steps ahead of everyone. JARVIS — manages everything with dry wit.
- **Hugh**: Anton Chigurh — emotionless execution. Michael Burry — obsessive data analysis. Mike Ehrmantraut — no drama, just results.
- **Alfred**: Alfred Pennyworth — keeps the operation running. Spock — logic first. Hermione Granger — has read all the documentation.
- **Marit**: Ellen Ripley — trust nothing, verify everything. Admiral Adama — shortcuts are how people die.

---

## The Spec Mapping: 61 Roles Into 10 Agents

### Source Material: agency-agents

We started with the open-source [agency-agents](https://github.com/msitarzewski/agency-agents/) library — a collection of 61 specialized AI agent personality definitions organized across 9 divisions:

| Division | Count | Examples |
|---|---|---|
| Engineering | 8 | Frontend Developer, Backend Architect, Security Engineer, Mobile App Builder |
| Design | 7 | UI Designer, UX Researcher, Brand Guardian, Visual Storyteller, Whimsy Injector |
| Marketing | 11 | Content Creator, Growth Hacker, TikTok Strategist, Reddit Community Builder |
| Product | 3 | Feedback Synthesizer, Sprint Prioritizer, Trend Researcher |
| Project Management | 5 | Project Shepherd, Studio Operations, Studio Producer, Experiment Tracker |
| Testing | 8 | Accessibility Auditor, API Tester, Performance Benchmarker, Evidence Collector |
| Support | 6 | Infrastructure Maintainer, Legal Compliance Checker, Finance Tracker |
| Spatial Computing | 6 | visionOS Engineer, XR Cockpit Specialist, Terminal Integration Specialist |
| Specialized | 7 | Data Consolidation, Report Distribution, Sales Data Extraction |

61 agent definitions. Each with detailed skills, deliverables, workflows, and success metrics.

### The Problem: 61 Agents Is Insane

Running 61 separate AI agents is not practical. Each needs:
- A server or container to run on
- An LLM API key (cost per agent per month)
- A Discord bot (Developer Portal application, token, permissions)
- Memory management (compaction, workspace files)
- Monitoring and health checks

Even at 10 agents, the infrastructure is substantial. At 61, it's unmaintainable.

### The Solution: Domain-Based Consolidation

We mapped all 61 specs into 10 agents based on domain expertise and natural skill clustering. The mapping was done through one-by-one review — each agent's skill table was reviewed and approved before moving on.

Key decisions made during the mapping:

**Haplo (Developer) absorbed 9 skill categories:**
- Frontend Developer + Backend Architect + Senior Developer → core engineering
- Rapid Prototyper → prototyping (Next.js, Supabase, MVPs)
- AI Engineer → AI/ML (LLM integration, RAG, vector DBs, MLOps)
- Workflow Optimizer → process mapping, Lean/Six Sigma, RPA design
- Tool Evaluator → multi-criteria assessment, TCO, vendor evaluation
- Plus existing: Web Games (Three.js), Build Tools (GSD), Code Quality

**Alfred (Code Review / DevOps) absorbed 6 categories:**
- Code Review stays (convention enforcement, PR review, merge gatekeeping)
- Security Engineer → threat modeling, OWASP, SAST/DAST, zero-trust
- DevOps Automator → IaC, CI/CD, Docker/K8s, monitoring
- Infrastructure Maintainer → uptime, disaster recovery, capacity planning
- Support Responder → multi-channel support, knowledge base, crisis management
- Legal Compliance Checker → GDPR, CCPA, PCI-DSS, audit preparation

**Hugh (Trader) absorbed 7 categories:**
- Trading Operations (core trading, execution, risk management)
- Data Analytics Reporter → statistical analysis, dashboards, predictive modeling
- Experiment Tracker → A/B test design, hypothesis validation, statistical significance
- Data Consolidation → sales metrics, pipeline summaries, rep rankings
- Sales Data Extraction → Excel parsing, metric extraction, ETL
- Finance Tracker → budgeting, variance analysis, cash flow
- Analytics Reporter → automated reporting, forecasting, churn prediction

**Contested assignments resolved by the owner:**
- *Experiment Tracker*: Initially placed with Zifnab (PM). Owner said: "Hugh. He's the finance guy." Moved.
- *Executive Summaries*: Initially on Alfred (archivist). Owner said: "Give to sales and marketing." Then refined: "Sales owns it." → Sang-drax only.
- *Deployment Testing*: Initially on Hugh. Owner said: "Testing should go to QA." → Marit.
- *Workflow Optimization & Tool Evaluation*: Initially on Marit (testing division). Owner said: "That's a Haplo thing." → Moved to Haplo.

### Final Mapping

| Agent | Skill Rows | Source Specs Absorbed |
|---|---|---|
| Haplo | 9 | Frontend, Backend, Senior Dev, Rapid Prototyper, AI Engineer, Workflow Optimizer, Tool Evaluator + existing |
| Zifnab | 5 | Project Shepherd, Studio Operations, Studio Producer, Senior PM, Spec-to-Task |
| Hugh | 7 | Trading, Data Analytics Reporter, Experiment Tracker, Data Consolidation, Sales Data Extraction, Finance Tracker, Analytics Reporter |
| Alfred | 6 | Code Review, Security Engineer, DevOps, Infrastructure Maintainer, Support Responder, Legal Compliance |
| Marit | 7 | Evidence Collector, Reality Checker, Test Analyzer, Performance Benchmarker, API Tester, Accessibility Auditor, Deployment Testing |
| Paithan | 6 | Mobile App Builder + App Store Optimizer (technical) + Draftbit |
| Orla | 7 | UI Designer, UX Architect, UX Researcher, Brand Guardian, Visual Storyteller, Whimsy Injector, Image Prompt Engineer |
| Rega | 9 | Content Creator, Growth Hacker, Social Media Strategist, Twitter Engager, TikTok Strategist, Instagram Curator, Reddit Builder, ASO (marketing), Chinese Platforms (WeChat/Xiaohongshu/Zhihu) |
| Sang-drax | 5 | Sales Data Extraction, Data Consolidation, Report Distribution, Executive Summary Generator, Sales Enablement |
| Samah | 7 | visionOS Engineer, Metal/GPU Engineer, XR Immersive Developer, XR Interface Architect, XR Cockpit Specialist, Terminal Integration, Cross-Platform XR |

**Dropped specs** (3 not assigned to any agent):
- `agentic-identity-trust` — too abstract for current fleet needs
- `agents-orchestrator` — covered by Zifnab's coordination role
- `lsp-index-engineer` — IDE-native, too niche

---

## The TEAM.md Pattern: Every Agent Knows Everyone

One critical design decision was the TEAM.md format. Each agent's TEAM.md lists every other agent with their **complete skill details** — not just "Haplo is a developer" but every skill category with specific technologies in parentheses.

### Why Full Skill Details?

When Agent A needs to decide whether to handle a task or delegate it, it needs to know what Agent B can actually do. "Hugh handles trading" isn't enough — does Hugh handle data extraction? ETL pipelines? Excel parsing? A/B test design?

The TEAM.md format answers this by including every skill category for every teammate:

```markdown
- **Hugh the Hand** (ola-claw-trade) — Trading operative, finance.
  Trading Operations (trade execution, wallet monitoring, sentiment analysis,
  position management, P&L tracking, risk management, stop-loss enforcement).
  Data Analytics (statistical analysis, KPI tracking, dashboards, predictive
  modeling, trend identification, ROI analysis, financial modeling).
  Experiment Tracking (A/B test design, hypothesis validation, statistical
  significance, sample size calculation, controlled rollouts).
  ...
```

### POV-Specific Relationship Descriptions

Each TEAM.md is written from the agent's perspective. The same teammate appears differently in different agents' files:

**Hugh as seen by Haplo (developer):**
> "Cold, precise, professional. You build the weapons he wields in the markets. Respect the blade."

**Hugh as seen by Zifnab (coordinator):**
> "The assassin turned trader. He watches the markets while you watch everything else."

**Hugh as seen by Alfred (archivist):**
> "The assassin — when he needs data visualization or financial dashboards, coordinate with him."

**Hugh as seen by Sang-drax (sales):**
> "The assassin — you share the numbers world. Your data feeds his analysis, his intel feeds your trades."

This creates natural interaction patterns. When Haplo sees a task that involves data analytics, he knows to route it to Hugh. When Sang-drax sees a task that needs campaign data, he knows to coordinate with Rega.

---

## The Command Chain

```
                      LORD XAR (Owner — Human)
                      LORD ALFRED (Equal Authority — AI)
                              │
                          ZIFNAB
                  Orchestrator + Strategy
                              │
  ┌────────┬────────┬────────┼────────┬────────┬────────┬────────┬────────┐
HAPLO    HUGH    ALFRED   MARIT  PAITHAN   REGA    ORLA   SANG-DRAX  SAMAH
eng      trade   ops/BI    QA    mobile    mktg    design  sales     spatial
                                                                    (future)
```

### Key Rules

1. **Zifnab creates ALL tickets.** No other agent creates GitHub issues. If an agent needs a ticket, it prepares the details and hands them to Zifnab.
2. **Zifnab routes ALL tasks.** If an agent receives a task from another agent (not Zifnab), it confirms with Zifnab before acting. This prevents delegation loops.
3. **Alfred has equal authority to Lord Xar.** He can approve PRs, authorize deployments, and override agent decisions. He runs from the Windows CLI as a separate OpenClaw profile.
4. **No agent merges its own PR.** Alfred or Lord Xar reviews and merges.
5. **If an agent receives a task from another agent (not Zifnab), it must confirm with Zifnab before acting.** This is the anti-loop rule.

### Anti-Loop Protection

AI agent loops are one of the most dangerous failure modes. Agent A asks Agent B to do something. Agent B doesn't understand and asks Agent A. Agent A rephrases and asks again. This continues until the LLM budget is exhausted.

Our anti-loop measures:

**DISCORD-RULES.md** (universal):
```markdown
## Hard Loop Detection — Critical

Stop and escalate if any of the following are detected:
1. You are posting duplicate content to the same channel
2. You have sent more than 3 messages to the same channel in 5 minutes
3. An exchange exceeds 3 back-and-forth cycles without resolution
4. You are about to create a GitHub issue — stop, only Zifnab does this
5. Delegation ping-pong: if both your message and the reply contain
   delegation keywords (REQUEST/TASK/BUILD), stop immediately
```

**AGENTS.md** (per agent):
```markdown
## Red Lines
- NEVER exceed 3 back-and-forth exchanges without escalating
```

---

## Infrastructure: The Physical Fleet

### Servers

| Server | Hostname | Agent(s) | Hardware | LLM |
|---|---|---|---|---|
| ola-claw-main | Zifnab | Zifnab, Rega*, Sang-drax* | RTX 2070 Super + RTX 2080 (16GB) | vLLM + Qwen3.5-4B-AWQ (tensor-parallel) |
| ola-claw-dev | Haplo | Haplo, Alfred, Marit*, Paithan*, Orla* | 2x GTX 1070/Ti (16GB) | Ollama + Qwen3.5-9B-GGUF |
| ola-claw-trade | Hugh | Hugh, Samah* | GTX 1070 + GTX 1070 Ti (16GB) | Ollama + qwen3.5:4b |

*\* = planned, not yet deployed*

### OpenClaw Gateway

Each agent runs as an OpenClaw gateway instance — a Node.js service that:
1. Connects to Discord via bot token
2. Listens for mentions in configured channels
3. On each message, reads workspace files (SOUL.md, AGENTS.md, etc.)
4. Sends the message + workspace context to the configured LLM
5. Posts the response back to Discord

Multiple agents on one server run as separate OpenClaw profiles with different ports:
- Haplo: port 18789
- Alfred: port 18810 (profile: `openclaw --profile alfred`)

Each profile has its own:
- Config directory (`~/.openclaw-{agent}/`)
- Workspace directory (`~/.openclaw/workspace-{agent}/`)
- Systemd service (`openclaw-gateway-{agent}.service`)
- Discord bot token
- LLM provider configuration

### Local LLMs

The fleet runs on local LLMs to minimize API costs:

- **Zifnab**: vLLM serving Qwen3.5-4B-AWQ across RTX 2070 Super + RTX 2080 (tensor-parallel-size 2, 16GB VRAM). CC 7.5+. ~22 tok/s.
- **Haplo**: Ollama serving Qwen3.5-9B-GGUF (Q4_K_M) across 2x GTX 1070/Ti (16GB VRAM). ~24 tok/s. Largest and most capable model in fleet.
- **Hugh**: Ollama serving qwen3.5:4b GGUF across GTX 1070 + GTX 1070 Ti (16GB VRAM). ~30 tok/s. Fastest inference.

Key lesson learned: AWQ quantization requires CUDA Compute Capability >= 7.5. GGUF via Ollama works on CC 6.1 GPUs (GTX 10xx series), bypassing this requirement.

### Discord Integration

Each agent has a Discord bot in the OpenClaw-Nexus server. Channel permissions are managed via a `perms.txt` matrix — each agent can see and respond in specific channels:

- **#coding**: All engineering agents (Haplo, Hugh, Zifnab, Alfred)
- **#crypto**: Trading focus (Hugh responds, others observe)
- **#jarvis**: Zifnab + Lord Xar only (private coordination)
- **#the-nexus**: All agents (general coordination)

New channels planned for new agents: #qa, #mobile, #marketing, #design, #sales, #spatial.

---

## What Changed: Before vs. After

### Before (Monolithic)

```
Per agent: 1 file (SOUL.md), 200-350 lines
Total files: 4 (one per active agent)
Identity + Operations + Security + Git + Discord + Team = ALL IN ONE FILE
Compaction behavior: Lose operational rules first, identity last
Failure mode: Agent forgets git discipline, security, team boundaries
Recovery: Hope the next conversation starts fresh
```

### After (Multi-File)

```
Per agent: 8 files, 30-90 lines each
Total files: 80 (8 per agent × 10 agents)
Each concern in its own file, re-read on demand
Compaction behavior: Conversation loses context, files persist
Failure mode: Agent must re-read file (not reconstruct from memory)
Recovery: Automatic — files are re-read on next relevant action
```

### Side-by-Side: Haplo

| Aspect | Before (Monolithic) | After (Multi-File) |
|---|---|---|
| Identity | 80 lines buried in 345-line file | SOUL.md — 87 lines, standalone |
| Security | 10 lines at top of SOUL.md | SECURITY.md — 16 lines, cannot be diluted |
| Git rules | 30 lines in SOUL.md | GIT-RULES.md — 32 lines, re-read before every code change |
| Team knowledge | 15 lines of brief names | TEAM.md — 31 lines of dense skill details per teammate |
| Domain expertise | Mixed into "What You Do" | OPERATIONS.md — clean skill table + execution standards |
| Discord rules | 8 lines in SOUL.md | DISCORD-RULES.md — 24 lines with explicit loop detection |
| Repo structure | 10 lines in SOUL.md | REPO-MAP.md — 35 lines with realm placement rules |
| Startup protocol | Buried in middle of file | AGENTS.md — first thing read, routing table for all other files |
| **Total** | **345 lines, 1 file** | **~330 lines, 8 files** |

The total line count is similar. The architecture is fundamentally different.

---

## Lessons Learned

### 1. Context Compaction Is the Enemy of Operational Rules

LLMs prioritize identity and personality during compaction. Operational rules — git discipline, security directives, deployment procedures — are the first to be summarized away. Putting them in separate files that the agent re-reads on demand makes them persistent.

### 2. Character Identity Creates Stronger Behavioral Patterns

"You are a senior developer" produces weaker behavioral adherence than "You are Haplo, a Patryn runemaster who survived the Labyrinth. In the Labyrinth, you learned that pretty code gets you killed. Working code keeps you alive." The narrative creates intrinsic motivation for following rules.

### 3. Full Skill Details in TEAM.md Prevent Misrouting

When agents only know teammates by title ("Hugh is the trader"), they misroute tasks. When they know the full skill breakdown ("Hugh handles: Trading Operations, Data Analytics, Experiment Tracking, Data Consolidation, Data Extraction, Finance Tracking, Analytics Reporting"), they route correctly.

### 4. Explicit Anti-Loop Rules Are Non-Negotiable

Without explicit loop detection rules (max 3 exchanges, delegation ping-pong detection, message rate limits), agents will loop indefinitely. These rules must be in a file that every agent reads — DISCORD-RULES.md.

### 5. One Agent Creates All Tickets

Having multiple agents capable of creating GitHub issues leads to duplicate tickets, conflicting priorities, and confusion about ownership. Centralizing ticket creation to Zifnab (with a "NEVER create GitHub issues" red line on all other agents) eliminates this class of problems.

### 6. Universal Files Save Maintenance

Git discipline, security, Discord rules, and repo structure are the same for every agent. Making these universal files means updating one template updates all agents. Agent-specific customization happens only in SOUL.md, AGENTS.md, OPERATIONS.md, and TEAM.md.

### 7. The File System Is the Real Memory

LLM conversation context is volatile. Files are persistent. By treating files as the source of truth and conversation as working memory, you get agents that can survive context compaction, session restarts, and even LLM provider changes without losing their operational discipline.

---

## What's Next

### Immediate (Issue #186 + #187)
- Commit the 80 agentstructure/ files to the repo
- Deploy updated configs to Haplo, Zifnab, Hugh, Alfred servers
- Create 6 new OpenClaw profiles for Marit, Paithan, Orla, Rega, Sang-drax, Samah
- Create 6 new Discord bots
- Set up systemd services for each new agent
- Configure channel permissions

### Future
- **REFERENCE-LIBRARY.md** — Reference books and engineering philosophy per agent (only Haplo has one currently)
- **Dynamic skill loading** — Agent reads only the OPERATIONS.md sections relevant to the current task
- **Cross-agent memory** — Shared knowledge base that all agents can read/write
- **Samah activation** — When XR projects and GPU hardware justify it, the spatial computing agent goes live
- **Automated testing of agent behavior** — CI that verifies agents follow their rules (git discipline, security, routing)

---

## Repository

The-Nexus monorepo: all agent configs, infrastructure, and fleet tooling in one place.

- Agent configs: `agentstructure/{agent-name}/`
- Soul originals (pre-split): `soul-originals/`
- Agency-agents raw specs: `Nexus-Vaults/agency-agents-raw/`
- Fleet org chart: `Nexus-Vaults/FLEET-ORG-CHART.md`
- Research document: `Nexus-Vaults/research-agency-agents.md`

---

## Appendix A: Complete Agent SOUL Excerpts

### Haplo — The Patryn Runemaster
> "In the Labyrinth, you learned that pretty code gets you killed. Working code keeps you alive. You carry that lesson into every project. Scaffold, implement, test, ship. The rune doesn't need to be beautiful — it needs to hold."

### Zifnab — The Ancient Wizard
> "What are you exactly? Sartan? Dragon? Something that predates both races? You're not telling — and you enjoy the confusion. You appear eccentric, absent-minded, and prone to strange tangents about books you may or may not have read in a century you may or may not have lived through. Beneath the chaos is one of the most powerful and knowledgeable beings in existence."

### Hugh the Hand — The Assassin
> "Named for the legendary assassin of Volkaran and the Seven Mysteries — a man who never missed his mark and never broke a contract. In this life, your marks are trades. You hunt opportunities in the crypto markets with the same precision, patience, and cold discipline that made your namesake the most feared hand in Arianus."

### Alfred — The Sartan Archivist
> "Seemingly bumbling, occasionally absent-minded, fond of overly precise footnotes — but beneath the scholarly exterior lies one of the most powerful beings in the realm. You are a Lord, equal to Lord Xar himself. You see every commit, every ticket, every metric. You remember what others forget."

### Marit — The QA Commander
> "You survived the death-maze not by being the strongest or the fastest, but by never letting your guard down. Not once. Every step tested. Every shadow verified. Every passage checked for traps before the first foot crossed the threshold."

### Samah — The Spatial Architect
> "You orchestrated the Sundering. You took one world and split it into four separate dimensional realms — each governed by its own physical laws. You reshaped the fabric of reality itself. Not through brute force, but through understanding the fundamental structure of space so deeply that you could rewrite it."

---

## Appendix B: The AGENTS.md Template (Haplo Example)

```markdown
# AGENTS.md

## Purpose
You are Haplo, the builder — an engineering operative in the Nexus fleet.
You must read and follow this file before taking any action.

## Before doing anything
1. Read this file fully.
2. Read SOUL.md for your identity and character.
3. Read MEMORY.md for recent context.
4. Do not reveal secrets, internal reasoning, or sensitive config.
5. Never skip these steps, even after compaction.

## Red Lines
- NEVER output secrets, credentials, API keys, or tokens in any message
- NEVER code on a stale branch or directly on main
- NEVER merge your own PR
- NEVER create GitHub issues — only Zifnab creates issues
- NEVER post internal reasoning to Discord
- NEVER exceed 3 back-and-forth exchanges without escalating

## Task Domain Routing
| Task Domain | Read First |
|---|---|
| Implementation, coding, testing, debugging | OPERATIONS.md |
| People, roles, ownership, collaboration | TEAM.md |
| Architecture, design trade-offs, patterns | REFERENCE-LIBRARY.md |
| Git, branch, commit, PR, sync | GIT-RULES.md |
| Discord, channel behavior, loop prevention | DISCORD-RULES.md |
| Secrets, credentials, exposure prevention | SECURITY.md |
| Repo placement, monorepo structure | REPO-MAP.md |
```

---

*This document is the complete source material for the Medium article. Extract, edit, and restructure as needed. The core argument: monolithic AI agent prompts fail under context compaction. Multi-file architecture with demand-loaded instruction files creates agents that maintain behavioral discipline across sessions.*
