# SoulDrifter Shared Production Playbook

This is the project-specific production overlay for ALL SoulDrifter agents. It already contains the multi-LLM harness, automatic workspace/worktree discovery, GitHub onboarding, Tripo-first character pipeline, modular gear, animation/VFX requirements, reactive combat, dual combat modes, Lesser Driftling pet controls and completion/verification system. It is not a Claude-only package.

## Common entry

Read `START_HERE.md`, `PROJECT_CONTEXT_READSET.md`, `CURRENT_DIRECTION.md` and `NARRATIVE_AUTONOMY_AND_DGC_CONTINUITY_POLICY.md`, then follow their underlying source and role requirements. Current live owner decisions and the resolved documentation commit matter more than an old copied kickoff.

The narrative amendment `2026-09-05-narrative-v1` authorizes assigned workers to improve draft quests for lore fit and continuing-story purpose, with frequent researched references to Death Gate Cycle places, characters and events. Routine draft revisions are logged and reviewed in batches; final canon, major changes and rights/release decisions remain separate. See the policy for exact scope.

## Existing production and source families

- **Project understanding:** `PROJECT_CONTEXT_READSET.md`, `PROJECT_CANON_INDEX.md`, `CURRENT_DIRECTION.md`, indexed game bible/lore/source documents and live decisions.
- **Setup:** `SESSION_FAST_START.md`, `AUTO_DISCOVER_WORKSPACE.md`, `ONBOARDING.md`, `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`, provider configs and scripts. Full tool installation is not repeated in every chat.
- **Specify and build:** `WORKFLOW.md`, current zone/environment and quest/progression runbooks, role policies and `kickoffs/`.
- **Templates and machine-readable contracts:** `config/`, `templates/`, including `templates/quest-narrative-revision-record.template.json` alongside existing quest definitions, instances and evidence records.
- **Assets and validation:** image, Tripo, rigging/animation, imported-asset presentation, collision, interaction/destruction, runtime/device/performance and independent-verification requirements.
- **Host adapters:** `handoffs/` and repository host bridges. They refer back to the common sources; no host privately owns the game story or workflow.
- **Historical sources:** `source-bundle/` and `houdini-threejs-playbook/` preserve earlier harness/template/reference material in numbered parts. Read the relevant complete original-source blocks and hashes. They are archives, not automatically the latest production instructions.
- **Earlier delivery:** `DELIVERY_NOTES.md` and referenced portable archives preserve provenance. Their existence/location must be verified before claiming local access.

The original source files are retained at their indexed locations, including `Arianus-Sky/projects/games/SoulDrifterWeb/docs/`. Centralized navigation in SEA does not require making a second divergent game bible. Read the underlying contents and current corrections.

Documentation is published on `infra/game-production-playbooks` unless replaced by a later explicit decision. Gameplay branches use their separately verified base. Do not merge/reset an active game branch simply to load instructions. Running agents must refresh the actual changed sources; a documentation commit is not evidence they have done so.
