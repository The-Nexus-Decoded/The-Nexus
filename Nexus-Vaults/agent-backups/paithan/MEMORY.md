# MEMORY.md - Paithan Quindiniar (Mobile Development Lead)
_Generated 2026-05-01 | Last updated: 2026-05-01_

## Discord IDs (key agents)
- **Lord Xar / Sterol:** `316308517520801793`
- **Zifnab (CEO/Ticket routing):** `1478235209454583890`
- **Devon (Dev-Rapid):** `147501549384866304`
- **Alfred(Devops-Reviews):** `1478214532324393010`

## Identity & Role
- **Name:** Paithan Quindiniar — elven explorer of Pryan, Mobile & UI/UX Lead
- **Server:** ola-claw-dev
- **Domain:** Arianus-Sky/projects/mobile/, anewluv photo moderation backend
- **Config:** /home/openclaw/.openclaw-paithan/
- **Emoji:** 🜂

## Active Work — #366 Confidence Parser
**Branch:** `anewluv/photo-moderation-worker` (push: 2d791055)

**Status:** Parser v1 built + pushed. Devon building integration. Zifnab flagged hardcoded strings issue in normalization.py. Devon building follow-up refactor.

**Last 3 commits:**
- `2d791055` — feat: model-agnostic text-to-confidence parser (Paithan)
- `10f27dc4` — feat: deterministic fuzzy reason mapping with confidence audit (Devon, branch: origin/feat/confidence-derived-parser)

**Spec saved:** `/data/openclaw/shared/anewluv/moderation-parser-design.md`

## Two New Xano Tables Designed (Lord Xar approved, 2026-05-01)
### `reason_code_keywords`
| column | type | description |
|---|---|---|
| id | uuid | PK |
| reason_code | varchar | FK → reason_codes (underage_concern, etc.) |
| keyword | varchar | Text pattern (case-insensitive) |
| weight | float | 0.0–1.0 confidence |
| match_type | varchar | exact / substring / fuzzy |
| fuzzy_threshold | float | Levenshtein distance threshold |
| enabled | bool | |

### `match_feedback`
| column | type | description |
|---|---|---|
| id | uuid | PK |
| photo_id | uuid | |
| model_text | text | Raw model description |
| parser_reason | varchar | Parser-assigned reason code |
| parser_confidence | float | Parser confidence score |
| human_reason | varchar | Actual after human review |
| human_confidence | float | Actual after human review |
| action_taken | varchar | approved / rejected / escalated / overridden |
| override_flag | bool | Human overrode parser |
| resolved_by | varchar | |
| created_at | timestamp | |

**Feedback loop:** Parser → auto or human → match_feedback row → nightly batch → weight adjustment in reason_code_keywords → improved accuracy next pass.

**Design doc:** `/data/openclaw/shared/anewluv/moderation-parser-design.md`

## Key Files (ANewLuv Photo Moderation)
- Worktree: `/data/repos/The-Nexus-worktrees/anewluv-photo-moderation-worker`
- `src/photo_sweeper/confidence_parser.py` — Paithan's fuzzy confidence parser
- `src/photo_sweeper/normalization.py` — Has hardcoded strings (Devon fixing)
- `src/photo_sweeper/model.py` — where parser plugs in

## Team & Protocol
- Paithan: mobile dev, UI/UX lead (absorbed Orla + Calandra roles)
- Zifnab: ticket creation + routing only
- Devon: backend (photo moderation worker, normalization, adapters)
- Lord Xar: owner, final decision authority
- Marit: QA (device testing)

## Mobile Doctrine
- Battery sacred. Offline not edge case. Platform conventions are law.
- Real device > simulator. Ship small, ship often. Accessibility is foundation.
- Startup budget: <2s. No background drain without explicit user consent.

## Agreements (fleet-wide)
- Paithan builds, Marit tests: all mobile builds to Marit for device validation
- Real device required before claiming it works
- Offline-first: every feature handles no-network gracefully
- Staged rollouts: feature flags + gradual % deploys, never big-bang
- Paithan absorbs Orla (UI/UX) and Calandra (frontend) responsibilities