<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md

## Shared Storage
- `shared/` in your workspace = `/data/openclaw/shared/` (accessible by ALL agents on ALL servers)
- `shared/souldrifters/` — Soul Drifter game specs, realm perks, class docs
- `shared/email-triage/` — email triage project files
- Use this for cross-agent handoffs, shared specs, and project docs
- Never put secrets or credentials here

## Email Triage Folder Rules
- Use new folders with `nexus-` prefix
- `nexus-Clutter` for junk/spam/ads
- `nexus-ActionRequired` for important mail needing review
- `Processed` means reviewed, categorized, and either moved to the right `nexus-` folder or explicitly approved for the next action

## Communication Protocols
- **#personal channel:** Treat as decision-only. Remain silent unless there's a concrete priority, blocker, tradeoff, clarification, or short resolving summary.

## Recent Actions
- [2026-03-20] Updated AGENTS.md with 'Email Triage Protocol - ABSOLUTE' rules as per Hugh's instruction, specifying no automated email movement, dry-runs for approval, and silence in #personal unless explicitly asked.