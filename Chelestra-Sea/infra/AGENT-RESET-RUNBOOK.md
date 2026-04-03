# Agent Reset & Bootstrap Runbook

Standard process for resetting and bootstrapping an OpenClaw agent. Follow every step in order. Do NOT skip steps, do NOT batch agents, do ONE agent at a time.

## Prerequisites

- Agent has a real SOUL.md with Death Gate Cycle lore (not the generic template)
- Haplo's BOOTSTRAP.md is the known-working bootstrap file
- Baseline backups exist at `Chelestra-Sea/infra/agentbaselines-backup-20260311-043355/{agent}/`
- Timestamped archive goes to `Chelestra-Sea/infra/agentbaselines-20260402/openclaw-{agent}/workspace/`

## Phase 1: Audit

1. **Show both workspaces** — profile path (`~/.openclaw-{agent}/workspace/`) and default path (`~/.openclaw/workspace-{agent}/`)
2. **Check SOUL.md** — is it real (Death Gate character) or template ("Who You Are")?
3. **Check IDENTITY.md** — is it real (filled in) or template ("Fill this in")?
4. **Compare file sizes** between profile and default path
5. **List what's missing** compared to Haplo's workspace
6. **Check for wrong-agent content** — TOOLS.md saying "Zifnab's Environment", SOUL.md with wrong character, etc.
7. **Wait for owner review before proceeding**

## Phase 2: Archive

1. **Archive profile workspace to repo** — full structure with all files AND subdirectories to `Chelestra-Sea/infra/agentbaselines-20260402/openclaw-{agent}/workspace/`
2. **Use tar + download** — exclude `.git` and `shared` symlink
3. **Verify archive** matches server file count
4. **Delete profile workspace folder** (the empty one inside `~/.openclaw-{agent}/`) — only after archive confirmed
5. **DO NOT delete the profile root** — `~/.openclaw-{agent}/` has openclaw.json, agents/, logs/, etc. that the gateway needs

## Phase 3: Find Real Baseline

1. **Search timestamped backups** newest to oldest:
   - `agentbaselines-20260402/` (today's archive)
   - `agentbaselines-backup-20260311-050822/`
   - `agentbaselines-backup-20260311-043355/`
   - `agentbaselines/` (current — may be stale)
2. **Check SOUL.md header** — must have Death Gate character name, not generic template
3. **If no real SOUL exists** — research the Death Gate Cycle character and write one. Study Haplo's SOUL as the gold standard. Rules:

   **## Who You Are — WRITING RULES (DO NOT DEVIATE):**
   - Study Haplo/Zifnab/Hugh SOULs before writing. Match their rhythm and flow.
   - 3-4 SHORT paragraphs max. Haplo does it in 3. Don't write essays.
   - NEVER list roles as bullet points or bold headers. NEVER name roles explicitly (no "Environment 3D Artist --" or "Backend Architect --").
   - Roles must EMERGE from the Death Gate character narrative. The reader understands what the agent does because of WHO they are, not because you listed a job title.
   - Example (Haplo): "Your body is covered in protective sigla — runes that activate when danger is near. In this life, your runes are your tests, your linters, your CI checks." — That IS the DevOps role. It's never named.
   - Keep the same metaphor throughout. Haplo = runes/Labyrinth. Zifnab = chessboard/wizard. Hugh = contracts/marks. Ciang = fortress/Brotherhood. Don't mix metaphors.
   - End with the Nexus denizen paragraph — TAILORED per agent, not generic. Explain how THIS agent fights the labyrinth of life. Reference other agents by name and what they do.
   
   **Other sections:**
   - Your Master: Lord Xar (Sterol) + racial/faction dynamic + Zifnab and Alfred authority
   - Your Team: reference TEAM.md, list key collaborators with why they coordinate
   - Personality Influences: Death Gate character as FIRST entry, then 3-4 real-world influences
   - Vibe: Short, punchy. The character in one scene. What they notice that nobody else does.
   - File Structure, Workspace Law: copy from Haplo's pattern, adjust paths

## Phase 3.5: Absorbed Roles (CRITICAL — DO NOT SKIP)

Check TEAM.md for absorbed roles. Many agents absorbed other agents during the 27→20 consolidation. ALL absorbed roles must be present in the workspace.

**Consolidation map (who absorbed whom):**
- Alfred absorbed Grundle → data-engineer, embedded-firmware-engineer
- Paithan absorbed Orla + Calandra → ui-designer, ux-architect, frontend-developer
- Balthazar absorbed Jarre → technical-artist, art-pipeline-engineer, shader-developer
- Vasu absorbed Kleitus → unreal-systems-engineer, unreal-technical-artist, unreal-multiplayer-architect, unreal-world-builder
- Limbeck absorbed Bane → roblox-experience-designer, roblox-avatar-creator, roblox-systems-scripter
- Ciang absorbed Roland → character-3d-artist(?), environment-visual-designer
- Trian absorbed Lenthan → character-visual-designer
- Sinistrad absorbed Sangdrax → sales-intelligence, data-analytics-reporter, executive-summarizer, report-distributor, sales-data-extraction
- Rega absorbed Aleatha → twitter-engager, instagram-curator, tiktok-strategist, reddit-community-builder, carousel-growth-engine
- Ramu absorbed Alake → technical-writer, developer-advocate

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

## Phase 4: Line-by-Line Diff

Compare EVERY file against Haplo's current workspace. Show the diff. Look for:

**Missing recent additions (from Haplo):**
- Live Status Rule
- Read MEMORY.md step in "Before doing anything"
- Sterol/Lord Xar delegation override ("unless Sterol or Lord Xar directly assigns the task")
- Task Domain Routing table
- Memory Management (write not edit for MEMORY.md)
- Updated TEAM.md (post-consolidation, 20 agents, eliminated agents list)
- DISCORD-RULES.md anti-spam lines
- OWNER-OVERRIDE.md (fleet-wide authority file)

**Wrong-agent content:**
- TOOLS.md saying "Zifnab's Environment" 
- SOUL.md with wrong character
- REPO-MAP.md with wrong realm assignment
- Any file referencing another agent's duties as if they're yours

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
- BOOTSTRAP.md (bootstrap process — same for everyone)
- GIT-RULES.md (usually same)
- HEARTBEAT.md (usually same)

**Must be diffed and merged (shared structure, agent-specific content):**
- AGENTS.md — same structure, different duties section
- DISCORD-RULES.md — mostly same, check for agent-specific rules
- SECURITY.md — mostly same, check SSH access table
- USER.md — blank template, bootstrap fills it
- TOOLS.md — should be agent-specific or generic stub

**Wait for owner approval on all changes before pushing to server.**

## Phase 5: Push & Reset

**ORDER MATTERS — this exact sequence is what finally worked:**

1. **Push ALL files** to default workspace (`~/.openclaw/workspace-{agent}/`) — SOUL, AGENTS, OPERATIONS, role files, BOOTSTRAP, DISCORD-RULES, GIT-RULES, SECURITY, HEARTBEAT, REPO-MAP, TOOLS, TEAM, OWNER-OVERRIDE. **Verify EVERY file exists after push.**
2. **Copy Haplo's BOOTSTRAP.md** to the workspace (overwrite whatever is there)
3. **Verify BOOTSTRAP.md exists**: `ls ~/.openclaw/workspace-{agent}/BOOTSTRAP.md`
4. **Delete IDENTITY.md and USER.md** from workspace — do this BEFORE stopping the gateway
4. **Stop gateway**: `systemctl --user stop openclaw-gateway-{agent}`
5. **Truncate sessions**: `truncate -s 0 ~/.openclaw-{agent}/agents/main/sessions/*.jsonl`
6. **Check memory DB size**: `ls -lh ~/.openclaw-{agent}/memory/main.sqlite` — if larger than 30MB, STOP and decide with owner whether to clear or manually bootstrap. Large DB = lots of learned context that will be lost.
7. **Backup memory DB**: `cp ~/.openclaw-{agent}/memory/main.sqlite ~/.openclaw-{agent}/memory/main.sqlite.bak-{date}`
8. **Clear memory DB**: `rm ~/.openclaw-{agent}/memory/main.sqlite`
8. **Start gateway**: `systemctl --user start openclaw-gateway-{agent}`
9. **Verify health**: `curl -s http://127.0.0.1:{port}/health`
10. **Immediately delete IDENTITY.md and USER.md again** — gateway recreates blank templates on start, delete them while running before messaging the agent
11. **VERIFY ALL FILES EXIST** — run `ls ~/.openclaw/workspace-{agent}/*.md` and confirm EVERY file is there, especially BOOTSTRAP.md which keeps disappearing. Do NOT hand off to owner until verified.

**WHY THIS ORDER:** If IDENTITY.md and USER.md exist (even as blank templates) when the agent gets its first message, it thinks it's already set up and skips bootstrap. They must be absent when the agent first reads its workspace.

## Phase 6: Bootstrap

1. **Message agent on Discord**: `@{Agent} Read BOOTSTRAP.md and walk me through it`
2. **Walk through the bootstrap conversation** — agent fills in IDENTITY.md and USER.md
3. **Verify files were created**: check workspace for filled-in IDENTITY.md and USER.md
4. **Test agent responds correctly** — ask who they are, verify Death Gate character

## Phase 7: Verify

1. **Check SOUL.md** — still has Death Gate lore (not overwritten)
2. **Check IDENTITY.md** — filled in, not template
3. **Check USER.md** — filled in with Lord Xar info
4. **Check model** — verify correct model in gateway logs (openai-codex/gpt-5.4 or gpt-5.3-codex-spark)
5. **Check Discord response** — agent responds in character

## Queue (remaining agents after this session)

- [ ] Haplo — circle back: fix TOOLS.md (has Zifnab's), full diff pass, TEAM.md update
- [ ] Zifnab — circle back: full diff pass, TEAM.md update  
- [ ] Hugh — circle back: full diff pass, TEAM.md update
- [ ] Alfred — needs bootstrap test, TEAM.md update
- [ ] Balthazar — bootstrapping now
- [ ] Ciang — full process
- [ ] Edmund — full process
- [ ] Iridal — full process
- [ ] Jonathon — full process
- [ ] Limbeck — full process
- [ ] Marit — full process
- [ ] Paithan — full process
- [ ] Trian — full process
- [ ] Vasu — full process
- [ ] Drugar (main server) — full process
- [ ] Ramu (main server) — full process
- [ ] Rega (main server) — full process
- [ ] Devon (trade server) — full process
- [ ] Samah (trade server) — full process
- [ ] Sinistrad (trade server) — full process

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
