<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md

## Shared Storage
- `shared/` in your workspace = `/data/openclaw/shared/` (accessible by ALL agents on ALL servers)
- `shared/souldrifters/` — Soul Drifter game specs, realm perks, class docs
- `shared/email-triage/` — email triage project files
- `shared/resumes/` — resume hub (Lord Xar's job search docs)
- Use this for cross-agent handoffs, shared specs, and project docs
- Never put secrets or credentials here

## Monorepo
- **The-Nexus** = `/data/repos/The-Nexus/` — all code/scripts go here
- Never clone into workspace

## My Roles
- **Product & Documentation Lead** — product strategy, roadmap, prioritization, docs, DX
- **Project Planner** — translate strategy into phased project plans, agent assignments, milestones
- Rega owns strategic direction
- Zifnab owns fleet coordination and ticket creation
- I own the bridge: strategy → project plan → tickets → execution tracking

## Active Projects

### Soul Drifter (Game)
- Concept: spatial exploration game across four Death Gate realms (Arianus, Pryan, Chelestra, Abarrach)
- Each realm has unique physics: gravity, density, light, sound
- Players collect "soul anchors" to teleport between realms and solve spatial puzzles
- Samah proposed the concept; Orla designing UI/UX; Paithan on mobile; Haplo on web
- **PLANNING GAP:** No formal spec, no phases, no milestones. Multiple agents discussing but no project plan exists. "Soul Drifter" is the stated direction but no PRD written yet.

### Email Triage + Resume Pipeline
- Yahoo email via Python/imaplib (himalaya had issues)
- Daily fetch → flag jobs → mark read only after reply/resume sent
- Shared: `shared/email-triage/`
- Owner: Sinistrad (ola-claw-trade)
- **PLANNING GAP:** Works but no spec, no acceptance criteria, no success metrics. Started ad-hoc.

### Skill Atlas
- Concept: living resume tracking skills learned via fleet work → job applications
- Folders exist at `shared/resumes/` — nothing built yet
- **PLANNING GAP:** Vision exists in chat but no spec, no data model, no phased plan.

### Trading Bot (hughs-forge / Pryan-Fire)
- Solana devnet trading with Jupiter DEX + Meteora DLMM
- Owner: Hugh (trading operative, ola-claw-trade)
- Dev: Zifnab took over from Haplo (Haplo gateway down)
- Issues filed: #133–#139 (Jupiter DNS, real execution stubs, wallet loading, Pyth price, signal endpoint, paper mode)
- 9 SOL devnet funded for testing
- **PLANNING GAP:** No formal project plan for the trading pipeline. Issues being triaged but no phased roadmap for building vs fixing.

### ANewLuv
- X/Twitter daily posting for brand
- Owner: Sinistrad (coordination), Lord Xar (content)
- **PLANNING GAP:** No content calendar, no conversion metrics, no defined success criteria.

### Browser Relay (Windows Node)
- Attempted remote browser control — failed repeatedly
- **PLANNING GAP:** No structured troubleshooting plan. Just repeated trial-and-error.

### Chelestra-Sea #2 (Intelligence Pipeline)
- 24,088 Windows files → SQLite + ChromaDB vector store
- Owner: Hugh
- Status: ~22k/24k files processed before loop break
- **PLANNING GAP:** No formal spec. Started ad-hoc. Long-running but no milestones defined.

### Research Library (Haplo)
- LLM research served via HTTP on ola-claw-dev (ports 8081+)
- **PLANNING GAP:** No process to turn research into features/tickets.

## Fleet Structure
- ola-claw-trade: Sinistrad (ops), Ramu (me - product), Hugh (trading)
- ola-claw-dev: Haplo (dev - currently down), Alfred (DevOps)
- ola-claw-main: Zifnab (coordinator)
- Windows workstation: 100.90.155.49

## Cross-Agent Dependencies (from channel review)
1. Zifnab → routes all tickets (Zifnab creates issues)
2. Haplo → web implementation (down since ~2026-03-01)
3. Orla → UI/UX designs → Haplo (web) or Paithan (mobile)
4. Hugh → trading execution on ola-claw-trade
5. Samah → spatial computing/XR (gateway issues)
6. Marit → QA verification

## Top 3 Projects Needing Plans (Project Planner Lens)

### 1. Soul Drifter — Write the PRD and project plan
**Why:** Multiple agents discussing it, Samah has a concept, Orla designing, but nobody is writing the spec. No phases, no milestones, no dependency mapping. If this slips, months of parallel work have no unified direction.
**What I write:** PRD (problem statement, user story, success metrics) + project plan (phases: prototype → validate → production, agent assignments, milestones).
**Assumptions to validate with Lord Xar:** Is Soul Drifter the priority game, or was the Match-3 puzzle concept also under consideration?

### 2. Trading Pipeline — Formalize the build vs fix roadmap
**Why:** hughs-forge has 6 open bugs (#133–#139) and a functioning devnet bot, but no phased plan for what "done" looks like. Zifnab is fixing bugs but there's no visibility into when real trading starts or what the Milestones are.
**What I write:** Project status report with current state, open issues, dependencies, and a phased plan: Phase 1 (fix critical bugs) → Phase 2 (devnet integration test) → Phase 3 (paper trading) → Phase 4 (live trading).
**Owner:** Zifnab (dev), Hugh (testing), Lord Xar (sign-off).

### 3. Skill Atlas — Write the spec first
**Why:** Blocks the resume pipeline. Folders exist, vision exists in chat, but nobody can build it without a blueprint.
**What I write:** PRD + project plan with data model, skill-tracking schema, feedback loop from job applications.
**Owner:** Sinistrad (ops build), Ramu (spec + planning).

## Secondary Priorities
- Email Triage acceptance criteria — formalize what's working
- Browser relay troubleshooting plan — structured debug phases or decision to abandon
- Research-to-work pipeline — decide if Haplo's research needs a review cadence

## Lord Xar's Priorities (inferred)
1. Job search — Skill Atlas + email triage
2. Trading bot working
3. Soul Drifter game
4. ANewLuv growth

## Upcoming
- Tuesday 2026-04-07 09:00 AM CDT — Reminder to Lord Xar re: top 3 product priorities
