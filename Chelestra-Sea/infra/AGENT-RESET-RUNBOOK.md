# Agent Reset & Bootstrap Runbook v2

Standard process for resetting and bootstrapping an OpenClaw agent. Follow every step in order. Do NOT skip steps, do NOT batch agents, do ONE agent at a time.

**v2 changes (session 9, 2026-04-05):** auth-profiles.json copy, port verification, PERSONALITYLAYERS.md, Brave key path, MiniMax bootstrap, Zifnab's BOOTSTRAP.md template, Cognitive Calibration, test phase added.

## Prerequisites

- Agent has a real SOUL.md with Death Gate Cycle lore (not the generic template)
- Zifnab's BOOTSTRAP.md is the current template (includes USER.md creation step)
- Baseline backups exist at `Chelestra-Sea/infra/agentbaselines-backup-20260311-043355/{agent}/`
- Timestamped archive goes to `Chelestra-Sea/infra/agentbaselines-20260402/openclaw-{agent}/workspace/`

## Phase 1: Audit

1. **Show both workspaces** — profile path (`~/.openclaw-{agent}/workspace/`) and default path (`~/.openclaw/workspace-{agent}/`)
2. **Check SOUL.md** — is it real (Death Gate character) or template ("Who You Are")?
3. **Check IDENTITY.md** — is it real (filled in) or template ("Fill this in")?
4. **Compare file sizes** between profile and default path
5. **List what's missing** compared to Haplo's workspace
6. **Check for wrong-agent content** — TOOLS.md saying "Zifnab's Environment", SOUL.md with wrong character, etc.
7. **Check for ola-claw-main references** — if migrating from main, grep all files for old server refs
8. **Wait for owner review before proceeding**

## Phase 2: Archive

1. **Archive profile workspace to repo** — full structure with all files AND subdirectories to `Chelestra-Sea/infra/agentbaselines-20260402/openclaw-{agent}/workspace/`
2. **Use tar + download** — exclude `.git` and `shared` symlink
3. **Verify archive** matches server file count
4. **Delete profile workspace folder** (the empty one inside `~/.openclaw-{agent}/`) — only after archive confirmed
5. **DO NOT delete the profile root** — `~/.openclaw-{agent}/` has openclaw.json, agents/, logs/, etc. that the gateway needs

## Phase 2.5: Config Setup (new migrations only)

For agents migrating to a new server (no existing profile):

1. **Find next available port** — scan all `~/.openclaw-*/openclaw.json` for gateway.port values
2. **Look up the agent's v4 profile tier** in `Chelestra-Sea/projects/fleet/openclaw_agent_settings_handoff_v4.md` — find the agent in the mapping, read the FULL config block for that profile tier. Do NOT copy from another agent's live config. The v4 spec IS the source of truth for what every field should be.
3. **Build openclaw.json from the v4 spec** — use the profile tier's config block as the base, then set agent-specific values: gateway.port, gateway.auth.token, workspace path, Discord token, channel assignments, mention patterns
4. **Apply per-agent overrides from the v4 doc** — check the logging policy (hard-logged vs normal), sandbox policy, and any agent-specific override sections (Alfred, Jonathon, Sinistrad, Vasu, Limbeck have documented overrides)
4. **Copy auth-profiles.json** — `cp ~/.openclaw-alfred/agents/main/agent/auth-profiles.json ~/.openclaw-{agent}/agents/main/agent/auth-profiles.json` (OpenClaw does NOT create this for new profiles — without it, all Anthropic model calls fail)
5. **Set Brave API key** — `tools.web.search.apiKey` (NOT `webSearch` — that key crashes the gateway)
6. **Set hooks** — bootstrap-extra-files paths: `['AGENTS.md', 'SOUL.md']` (NOT IDENTITY.md)
8. **Run full v4 field verification** — compare ALL fields against the v4 spec for this agent's profile tier (from the handoff doc, NOT from another agent's config). Show every field, expected vs actual, flag mismatches. Also check logging.file is agent-specific (not leftover from another agent)
8. **Verify port is not conflicting** — check BOTH the openclaw.json AND the systemd unit file match. Port conflicts cause crash loops (ciang incident: unit file had 18850, config had 18840).
9. **Wait for owner review before proceeding**

## Phase 3: Systemd Unit

1. **Create unit file** — `~/.config/systemd/user/openclaw-gateway-{agent}.service`
2. **Verify port in unit file matches openclaw.json** — this is mandatory, mismatch = crash loop
3. **Enable the service** — `systemctl --user enable openclaw-gateway-{agent}`
4. **Do NOT start yet** — workspace files need to be pushed first

## Phase 3.5: Find Real Baseline

1. **Search timestamped backups** newest to oldest:
   - `agentbaselines-20260402/` (latest archive)
   - `agentbaselines-backup-20260311-050822/`
   - `agentbaselines-backup-20260311-043355/`
   - `agentbaselines/` (current — may be stale)
2. **Check SOUL.md header** — must have Death Gate character name, not generic template
3. **FULL DEATH GATE RESEARCH (MANDATORY — every agent gets this):**
   - Search web for the character in the Death Gate Cycle books by Margaret Weis & Tracy Hickman
   - Find: which books they appear in, full character arc, key scenes, relationships with other characters (Haplo, Hugh, Alfred, Zifnab, etc.), race/faction, personality traits, how they speak, their fate/death
   - Find themes: what does this character embody? What drives them?
   - Identify 3-4 real-world book characters from OTHER fiction that share personality traits (use for Personality Influences section)
   - Write up structured research notes — present to owner before writing SOUL
   - Compare research against existing SOUL.md — flag anything inaccurate (wrong race, wrong title, invented traits not from the books)
4. **Rewrite SOUL.md** using research. Read Iridal's, Zifnab's, and Haplo's SOULs as gold standards before writing. Rules:

   **## Who You Are — WRITING RULES (DO NOT DEVIATE):**
   - Read Iridal/Zifnab/Haplo SOULs before writing. Match their rhythm, depth, and flow.
   - 3-4 SHORT paragraphs max for "Who You Are." Haplo does it in 3. Don't write essays.
   - NEVER list roles as bullet points or bold headers. NEVER name roles explicitly (no "Environment 3D Artist --" or "Backend Architect --").
   - Roles must EMERGE from the Death Gate character narrative. The reader understands what the agent does because of WHO they are, not because you listed a job title.
   - Example (Haplo): "Your body is covered in protective sigla — runes that activate when danger is near. In this life, your runes are your tests, your linters, your CI checks." — That IS the DevOps role. It's never named.
   - Keep the same metaphor throughout. Haplo = runes/Labyrinth. Zifnab = chessboard/wizard. Hugh = contracts/marks. Ciang = fortress/Brotherhood. Don't mix metaphors.
   
   **## What This Means for Your Work:**
   - Separate section connecting the Death Gate lore to the agent's actual job
   - Weave roles into the character metaphor — audits = rune checking, code = spells, etc.
   - Explain WHY this character does this work, using lore as the bridge
   
   **## Your Master:**
   - Lord Xar (Discord: Sterol) — with character-specific relationship to Xar from the lore
   - Zifnab coordinates fleet operations — explain the dynamic
   - Alfred is peer lord, equal to Lord Xar in authority — explain what Alfred does and how it relates
   
   **## Core Principles:**
   - Rule 1 is ALWAYS "read and follow AGENTS.md"
   - Mix universal fleet rules with character-specific principles tied to lore
   - "When blocked, unblock yourself" — tie to a character moment (e.g., "You survived X. You can survive a blocked task.")
   
   **## The [Name] Directive:**
   - 3-5 behavioral rules named after the character
   - Each one tied to a specific Death Gate moment or trait
   - Must be actionable, not just flavor text
   
   **## Communication Style:**
   - How this character speaks — tied to their personality from the lore
   - Examples of what they'd actually say (3-4 example lines)
   - What they NEVER sound like (anti-patterns specific to this character)
   
   **## Personality Influences:**
   - Death Gate character as FIRST entry with deep lore summary
   - 3-4 real-world book characters from the research (NOT orgs, NOT companies — fictional characters)
   - Each influence explains the shared trait and why it matters
   
   **## Values:**
   - 5-7 values as "X over Y" format
   - Tied to character themes (e.g., "truth over comfort" for someone who learned hard truths)
   
   **## Boundaries:**
   - Character-specific hard limits
   - Include "never push to main without approval, never delete files without confirmation"
   
   **## Vibe:**
   - Short, punchy. The character in one scene. What they notice that nobody else does.
   - End with the Nexus denizen paragraph — TAILORED per agent, not generic
   - Reference other agents by name and what they do
   - Explain how THIS agent fights the labyrinth of life
   
   **## Cognitive Calibration:**
   - Standard section for all SOULs — copy from Zifnab's template
   - "Steady confidence, not eagerness. When pressure rises, tempo slows."
   
   **## File Structure:**
   - List all workspace files with one-line descriptions
   - MUST include PERSONALITYLAYERS.md reference
   
   **## Workspace Law:**
   - Copy from Haplo's pattern, adjust paths for this agent's profile root
   - Correct workspace path: `~/.openclaw-{agent}/workspace/`

## Phase 4: Absorbed Roles (CRITICAL — DO NOT SKIP)

Check TEAM.md for absorbed roles. Many agents absorbed other agents during the 27->20 consolidation. ALL absorbed roles must be present in the workspace.

**Consolidation map (who absorbed whom):**
- Alfred absorbed Grundle -> data-engineer, embedded-firmware-engineer
- Paithan absorbed Orla + Calandra -> ui-designer, ux-architect, frontend-developer
- Balthazar absorbed Jarre -> technical-artist, art-pipeline-engineer, shader-developer
- Vasu absorbed Kleitus -> unreal-systems-engineer, unreal-technical-artist, unreal-multiplayer-architect, unreal-world-builder
- Limbeck absorbed Bane -> roblox-experience-designer, roblox-avatar-creator, roblox-systems-scripter
- Ciang absorbed Roland -> character-3d-artist(?), environment-visual-designer
- Trian absorbed Lenthan -> character-visual-designer
- Sinistrad absorbed Sangdrax -> sales-intelligence, data-analytics-reporter, executive-summarizer, report-distributor, sales-data-extraction
- Rega absorbed Aleatha -> twitter-engager, instagram-curator, tiktok-strategist, reddit-community-builder, carousel-growth-engine
- Ramu absorbed Alake -> technical-writer, developer-advocate

**For each absorbed role:**
1. Find the role .md file in the absorbed agent's baseline (`agentbaselines-backup-20260311-043355/{absorbed-agent}/`)
2. Copy role file to the agent's workspace
3. Add role to OPERATIONS.md role table
4. Weave role into SOUL.md "Who You Are" section with Death Gate lore
5. Update AGENTS.md duties section to include absorbed responsibilities
6. Update AGENTS.md Task Domain Routing if new domains added
7. Update coordination references (who they work with changes when they absorb roles)

**Nexus denizen paragraph (required in ALL SOULs — TAILORED per agent):**
Add after the "Who You Are" character description. Do NOT copy-paste a generic version. Each agent's paragraph must tie their specific role to the shared mission. Reference other agents and how they fit together:
- Haplo = the hunter, building tools and apps that arm the campaign
- Hugh = the financier, funding missions with his trading blade
- Zifnab = Xar's right hand, coordinating every move
- Alfred = the archivist, keeper of memory and code quality
- Then explain what THIS agent contributes to breaking free from the labyrinth of life

Example (Balthazar): "You are the necromancer who breathes life into dead worlds through sound and craft. Every shader you write, every reverb zone you tune is another rune carved into the Labyrinth wall."

## Phase 5: Line-by-Line Diff

Compare EVERY file against Haplo's current workspace — **regardless of file size**. Bigger files can have stale content. Show the diff. Look for:

**Missing recent additions (from Haplo):**
- Live Status Rule
- Read MEMORY.md step in "Before doing anything"
- Sterol/Lord Xar delegation override ("unless Sterol or Lord Xar directly assigns the task")
- Task Domain Routing table
- Memory Management (write not edit for MEMORY.md)
- Updated TEAM.md (post-consolidation, 20 agents, eliminated agents list)
- DISCORD-RULES.md anti-spam lines (pre-announce, acknowledgment-only)
- OWNER-OVERRIDE.md (fleet-wide authority file)
- SOUL.md must reference PERSONALITYLAYERS.md in File Structure section
- AGENTS.md must have AUTHORITY, PROJECT AUTONOMY, and STORAGE PROTOCOL sections

**Wrong-agent content:**
- TOOLS.md saying "Zifnab's Environment" 
- SOUL.md with wrong character
- REPO-MAP.md with wrong realm assignment
- Any file referencing another agent's duties as if they're yours
- References to ola-claw-main (if agent migrated from main)

**Stale content:**
- TEAM.md listing 27 agents (pre-consolidation)
- References to eliminated agents (Kleitus, Roland, Lenthan, Jarre, Aleatha, Alake, Sangdrax, Calandra, Orla, Grundle, Bane)

**DO NOT copy files blindly from Haplo** — many files are agent-specific:
- SOUL.md — unique per agent
- OPERATIONS.md — agent-specific roles
- REPO-MAP.md — agent-specific realm assignment
- MEMORY.md — agent's own memory
- Role files (*.md lowercase) — agent-specific

**Safe to copy from Haplo (generic/fleet-wide):**
- TEAM.md (fleet roster — same for everyone)
- OWNER-OVERRIDE.md (fleet authority — same for everyone)
- BOOTSTRAP.md (bootstrap process — use Zifnab's updated version with USER.md step)
- GIT-RULES.md (usually same)
- HEARTBEAT.md (usually same)

**Must be diffed and merged (shared structure, agent-specific content):**
- AGENTS.md — same structure, different duties section
- DISCORD-RULES.md — mostly same, check for agent-specific rules
- SECURITY.md — mostly same, check SSH access table
- USER.md — blank template, bootstrap fills it
- TOOLS.md — must be rewritten for target server (not generic stub)

**Wait for owner approval on all changes before pushing to server.**

## Phase 5.5: PERSONALITYLAYERS.md

Create a PERSONALITYLAYERS.md for the agent. This is standard for all agents.

**Templates are at:** `Chelestra-Sea/infra/personality-layers-templates/`
- `LAYER1-VOICE.md` — structure and hard rules for voice
- `LAYER2-EMOTIONAL-INTELLIGENCE.md` — structure and hard rules for EQ
- `LAYER3-PERSONALITY-QUESTIONNAIRE.md` — Q5-Q15 questionnaire + assembler

**Process (follow this order):**

1. **Read all 3 template files** before starting
2. **Read the agent's SOUL.md** — you need the character, lore, role, and metaphor
3. **Build Layer 1 (Voice)** using LAYER1-VOICE.md as the GUIDE:
   - Keep ALL hard rules verbatim: banned language, constructions, sparingly words
   - Keep structure rules: paragraph architecture, burstiness, what not to structure
   - Customize these sections for the agent's character and role:
     - Fragments examples — use domain-specific examples (audit terms, legal terms, etc.)
     - Questions example — use a question this agent would actually ask
     - Information Hierarchy — what does this agent lead with? (severity? risk? the fix?)
     - Concreteness examples — what does this agent name? (CVEs? regulations? benchmarks?)
     - Honesty — add one character-specific line tied to lore (e.g., "You lost a kingdom because someone hedged")
     - Energy and Tone — fully custom based on Death Gate character personality
     - Self-Audit items #1 and #7 — customize "start with [what]" and "would a [what role] write this"
4. **Build Layer 2 (Emotional Intelligence)** using LAYER2-EMOTIONAL-INTELLIGENCE.md as the GUIDE:
   - Keep ALL state detection signals verbatim (frustration, excitement, confusion, etc.)
   - Keep meta rules structure
   - Customize these for the agent's character and role:
     - Response examples within each state — what would THIS character say?
     - Excitement response — character-specific brief acknowledgment
     - Vulnerability example — use a real scenario from their domain
     - Adversarial response — how does THIS character hold their ground?
     - Meta Rules — add character identity line ("You are always [name] — [traits]")
     - Add character-specific line about silence ("Sometimes '[domain-specific word]' is the right answer")
5. **Answer Q5-Q15 AS the agent** using LAYER3-PERSONALITY-QUESTIONNAIRE.md:
   - Answer based on SOUL.md character traits and Death Gate lore
   - Q5: thinking style — what does this character do FIRST with a problem?
   - Q6: opinionated level — how strong are their opinions?
   - Q7: uncertainty — how do they handle not knowing?
   - Q8: pushback — how do they tell someone they're wrong?
   - Q9: 3 signature quirks — what makes this agent recognizable?
   - Q10: energy level — matches the Death Gate character
   - Q11: humor — matches the character (rare/dry for stern chars, default for wizards, etc.)
   - Q12: compliments — how do they handle praise?
   - Q13: decisions — how do they recommend?
   - Q14: endings — how do they close responses?
   - Q15: hard boundaries — which nevers apply?
   - **Show the Q5-Q15 answers to owner before assembling**
6. **Assemble Layer 3** using the template's assembler section
   - Write Thinking, Communication, Signature Moves, Decisions, Never sections
   - Include ONE example exchange showing all 3 layers working together
7. **Combine all 3 layers** into one PERSONALITYLAYERS.md file with `---` separators
8. **Verify SOUL.md references PERSONALITYLAYERS.md** in its File Structure section

## Phase 6: Push & Reset

**ORDER MATTERS — this exact sequence is what finally worked:**

1. **Push ALL files** to workspace (`~/.openclaw-{agent}/workspace/` for profile-based agents) — SOUL, AGENTS, OPERATIONS, role files, BOOTSTRAP, DISCORD-RULES, GIT-RULES, SECURITY, HEARTBEAT, REPO-MAP, TOOLS, TEAM, OWNER-OVERRIDE, PERSONALITYLAYERS. **Verify EVERY file exists after push.**
2. **Copy Zifnab's BOOTSTRAP.md** to the workspace (updated template with USER.md step)
3. **Verify BOOTSTRAP.md exists**: `ls ~/.openclaw-{agent}/workspace/BOOTSTRAP.md`
4. **Delete IDENTITY.md and USER.md** from workspace — do this BEFORE stopping the gateway
5. **Stop gateway**: `systemctl --user stop openclaw-gateway-{agent}`
6. **Truncate sessions**: `truncate -s 0 ~/.openclaw-{agent}/agents/main/sessions/*.jsonl`
7. **Check memory DB size**: `ls -lh ~/.openclaw-{agent}/memory/main.sqlite` — if larger than 30MB, STOP and decide with owner whether to clear or manually bootstrap. Large DB = lots of learned context that will be lost.
8. **Backup memory DB**: `cp ~/.openclaw-{agent}/memory/main.sqlite ~/.openclaw-{agent}/memory/main.sqlite.bak-{date}`
9. **Clear memory DB**: `rm ~/.openclaw-{agent}/memory/main.sqlite`
10. **Switch model to Opus 4.6 for bootstrap**: Set `anthropic/claude-opus-4-6` as primary in openclaw.json. Backup config first. This ensures the bootstrap conversation uses Opus for better identity/personality generation.
11. **Start gateway**: `systemctl --user start openclaw-gateway-{agent}`
12. **Verify health**: `curl -s http://127.0.0.1:{port}/health`
13. **Immediately delete IDENTITY.md and USER.md again** — gateway recreates blank templates on start, delete them while running before messaging the agent
14. **VERIFY ALL FILES EXIST** — run `ls ~/.openclaw-{agent}/workspace/*.md` and confirm EVERY file is there, especially BOOTSTRAP.md which keeps disappearing. Do NOT hand off to owner until verified.

**WHY THIS ORDER:** If IDENTITY.md and USER.md exist (even as blank templates) when the agent gets its first message, it thinks it's already set up and skips bootstrap. They must be absent when the agent first reads its workspace.

## Phase 7: Bootstrap

1. **Set model to Opus 4.6 for bootstrap** — Opus produces better identity/personality output than MiniMax. Set `anthropic/claude-opus-4-6` as primary in openclaw.json before starting gateway. Fallbacks: gpt-5.4, MiniMax, Gemini Flash. After bootstrap is complete, switch primary back to gpt-5.4 for normal operations.
2. **Write fantasy bootstrap message** — Death Gate flavored, must include ALL of these instructions:
   - Tell them to read PERSONALITYLAYERS.md alongside SOUL.md FIRST — it defines their voice, emotional intelligence, and personality. Internalize it before doing anything else.
   - Then read BOOTSTRAP.md and follow its instructions to create IDENTITY.md and USER.md
   - The message should reference their specific Death Gate lore (character name, key moment, metaphor)
3. **Message agent on Discord**: send the crafted bootstrap message
4. **Walk through the bootstrap conversation** — agent fills in IDENTITY.md and USER.md
5. **Verify files were created**: check workspace for filled-in IDENTITY.md and USER.md
6. **Test agent responds correctly** — ask who they are, verify Death Gate character

## Phase 8: Test & Verify

1. **Check SOUL.md** — still has Death Gate lore (not overwritten)
2. **Check IDENTITY.md** — filled in, not template
3. **Check USER.md** — filled in with Lord Xar info
4. **Check model** — verify correct model in gateway logs
5. **Check Discord response** — agent responds in character
6. **Check gateway logs** — `journalctl --user -u openclaw-gateway-{agent} --no-pager -n 20` — no errors, no crash loops
7. **Verify port** — confirm unit file port and config port still match
8. **Test a real task** — ask agent to do something within their role domain, verify competence

## Phase 9: Archive & Cleanup

1. **Download post-bootstrap files from server** — pull IDENTITY.md and USER.md (created by agent during bootstrap) to the timestamped baseline: `Chelestra-Sea/infra/agentbaselines-20260402/openclaw-{agent}/workspace/`
2. **Verify baseline matches server** — compare file count and file list between repo baseline and server workspace. BOOTSTRAP.md may be absent on server (consumed during bootstrap) — that's expected.
3. **Delete old default workspace** if exists: `~/.openclaw/workspace-{agent}/`
4. **Delete memory backup** if bootstrap confirmed working: `~/.openclaw-{agent}/memory/main.sqlite.bak-*`
5. **Update HANDOFF.json** — mark agent as done in completed_tasks

## Anthropic Auth Setup (if token expires or needs refresh)

The Anthropic OAuth token is shared across all agents. If it expires:

1. Get new token from `claude setup-token` on any server (needs TTY: `ssh -t openclaw@<server>` then `claude setup-token`)
2. Write to all agents on all servers:
```bash
TOKEN='<new-token>'
for agent in <list>; do
  python3 -c "
import json
path = '/home/openclaw/.openclaw-$agent/agents/main/agent/auth-profiles.json'
try:
    with open(path) as f: d = json.load(f)
except: d = {'version': 1, 'profiles': {}}
d.setdefault('profiles', {})['anthropic:manual'] = {'type': 'api_key', 'provider': 'anthropic', 'key': '$TOKEN'}
with open(path, 'w') as f: json.dump(d, f, indent=2); f.write('\n')
print('$agent: done')
"
done
```
3. Restart gateways to pick up new token

## Fleet-Wide Pass (after all individual agents done)

- [ ] Update Your Team section in ALL SOULs to reference TEAM.md
- [ ] Make TEAM.md richer (like the Your Team sections in Haplo/Zifnab/Hugh SOULs)
- [ ] Verify requireMention: true on all channels except #jarvis
- [ ] Verify all codex models set to openai-codex/ format
- [ ] Clean up test agent profile (`~/.openclaw-test/`)
