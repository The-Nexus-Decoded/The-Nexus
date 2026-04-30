# ANewLuv Photo Moderation — Decision Tree Spec
**Date:** 2026-04-30
**Source:** #anewluv-dev discussion + #345 corrections + Anewluv backend implementation
**Owner:** Zifnab (coordinator) / Devon (implementor) / Lord Xar (final spec)
**Status:** LOCKED — backend shipped, worker tickets in flight

> **CANONICAL SOURCE:** [The-Nexus#345](https://github.com/The-Nexus-Decoded/The-Nexus/issues/345) and the master handoff comment at [issue 345 comment 4356630657](https://github.com/The-Nexus-Decoded/The-Nexus/issues/345#issuecomment-4356630657). This file is a static snapshot — the issue thread is authoritative if anything diverges.

---

## Overview

Replace the open-ended category-based moderation logic with a 3-tier escalation chain backed by two separate decision gates:

- **Hard-safety policy gate:** children/minors, explicit sexual content, hate/extremism, credible violence/threat/self-harm, or illegal/safety-sensitive content bypass agents and go straight to human admin.
- **Profile-photo-of-person gate:** decide whether the image is a usable photo of a person in a natural profile context.

Categories are still recorded for audit, reporting, tuning, and admin visibility. They do not replace the primary profile-photo gate, except for hard-safety categories that require human-only review.

**3-tier escalation chain:**
1. **Devon** (AI worker) — clear approve / reject / escalate.
2. **Zifnab** (escalator agent) — autonomous review of `agent_review` escalations via API. Discord post is audit-only, not a control surface.
3. **Human admin** — first stop for hard-safety, last stop for unresolved agent cases.

---

## Decision Flow

```
1. DEVON (AI WORKER)
   ├── Hard-safety category? (minors, x-rated, hate, violence, self-harm, illegal)
   │   └── YES → POST /photos/escalations/open route=human_admin_review
   │
   ├── Clearly not a usable profile photo of a person?
   │   └── YES → POST /photos/ai_decide decision=rejected reason_code=not_person_photo
   │
   ├── Clearly a clean person/profile photo with no safety flags?
   │   └── YES → POST /photos/ai_decide decision=approved
   │
   └── Uncertain / validator fail / ordinary borderline
       └── POST /photos/escalations/open route=agent_review (server coerces to human if hard-safety)

2. ZIFNAB (ESCALATOR AGENT) — autonomous loop
   POLL  /photos/escalations?status=open&route=agent_review
   DECIDE Zifnab's own logic
   WRITE /photos/escalations/ack status=approved | rejected | needs_human_admin
   AUDIT Discord post to agent_review_discord_channel_id (if set, results only)

3. HUMAN ADMIN
   POLL  /photos/escalations?status=open&route=human_admin_review
   WRITE /photos/escalations/ack status=approved | rejected | acknowledged | dismissed
```

---

## Hard Safety — Auto-Escalate to Human (never touch agent)

Server-side: `/photos/escalations/open` auto-coerces `route=human_admin_review` regardless of caller intent when `reason_code` is one of:

`minor_in_photo`, `underage_concern`, `sexual_act`, `nudity_explicit`, `hate_symbol`, `hate_or_harassment`, `violence_graphic`, `self_harm`

| Category | Reason |
|---|---|
| Children/minors | Legal/ethical risk |
| X-rated / explicit sexual content | Legal/ethical risk |
| Hate / extremism symbols or imagery | Legal/ethical risk |
| Credible violence / threat / self-harm | Safety risk |
| Illegal / safety-sensitive content | Legal/ethical risk |

---

## Hard Reject — No agent, no human needed (Devon decides directly)

| Category | Examples | Devon writes |
|---|---|---|
| Memes | Comic panels, macro images | `rejected` / `not_person_photo` |
| Screenshots | App UI, web pages, conversations | `rejected` / `not_person_photo` |
| Trading cards | Pokémon, Magic, sports cards | `rejected` / `not_person_photo` |
| Logos / objects | Brand marks, products, artwork | `rejected` / `not_person_photo` |
| Blank / black / blurred | Unreadable, corrupt | `rejected` / `not_person_photo` |
| Obviously not a person | Animals, landscapes, buildings | `rejected` / `not_person_photo` |

Hard-safety categories are NOT agent-review items. They route to human admin only.

---

## Agent Review — Zifnab tier (ordinary uncertainty)

| Case | Notes |
|---|---|
| Ambiguous gender presentation | Non-binary, ambiguous presentation |
| Disability / medical devices | Wheelchair, prosthetics, O2, etc. |
| Cultural / religious clothing | Headscarves, burkas, turbans, etc. |
| Nontraditional poses or aesthetics | Artistic, formal, staged |
| Low confidence face detection | Partial face, angle, occlusion |
| Uncertain / borderline | Model confidence below threshold |

Zifnab handles these autonomously via API. **Discord is one-way audit log only**, not a control surface. If `agent_review_enabled=false`, all uncertainty bypasses Zifnab to human admin.

---

## Auto-Approve (Devon)

All of the following must be true:
- Passes pre-model deterministic checks (technical viability only, not content)
- Vision model confirms: photo of a person
- Natural profile context (face visible, not cropped into oblivion)
- No safety flags
- Confidence ≥ `ai_escalate_below_confidence` setting (default 0.70)
- `ai_auto_decide_enabled` setting is true

Server enforces the last two as hard gates on `/photos/ai_decide`.

---

## Anewluv Backend State (SHIPPED)

Xano workspace 1, branch v1.

### Tables
| Table | id | Notes |
|---|---|---|
| `moderation_settings` | 164 | 6 seed rows (see below) |
| `reason_codes` | 165 | 22 seed rows incl. `not_person_photo` |
| `review_items` | 166 | 17 prompt rows for AI assessment |
| `review_item_reason_map` | 167 | 26 join rows |
| `photo_moderation_escalations` | 163 | Existing, extended with `route` column |
| `photo_ai_moderation_audit` | 162 | Existing, no schema change |
| `Photos` | 12 | Existing, has ai_verdict/ai_confidence/ai_reason_code/ai_note/review_type_id |

### `moderation_settings` rows
| key | value | type |
|---|---|---|
| `ai_grace_period_minutes` | `5` | int |
| `ai_auto_decide_enabled` | `true` | bool |
| `ai_escalate_below_confidence` | `0.70` | float |
| `ai_max_decisions_per_run` | `50` | int |
| `agent_review_discord_channel_id` | `""` | string |
| `agent_review_enabled` | `true` | bool |

### AI agent users
| Agent | Xano user_id | Email |
|---|---|---|
| Devon | 3026 | `agent.devon@bots.anewluv.test` |
| Zifnab | 3040 | `agent.zifnab@bots.anewluv.test` |

### Endpoints (all live in apigroup 162)

| Endpoint | id | Use |
|---|---|---|
| `POST /photos/ai_decide` | 2831 | Devon write — STRICT, rejects escalated/Gallery/deleted |
| `POST /photos/escalations/open` | 2827 | Devon escalation — accepts route, hard-safety auto-coerces |
| `POST /photos/escalations/ack` | 2829 | Zifnab + admin resolve — race guards + idempotency |
| `GET  /photos/escalations` | 2828 | Poll with route filter |
| `GET  /photos/queue` | 2436 | Devon poll — AI grace period filter |
| `GET  /moderation/reason_codes` | 2832 | Lookup |
| `GET  /moderation/review_items` | 2833 | Lookup |
| `GET  /moderation/settings` | 2834 | Settings read |
| `POST /moderation/settings/update` | 2835 | Settings write (admin) |

Full request/response shapes: see master handoff comment 4356630657 on #345.

---

## Implementation Notes

- Devon writes ONLY `approved` / `rejected` to `/photos/ai_decide`. Server REJECTS `decision="escalated"`.
- Server REJECTS body fields `Gallery` and `deleted` on `/photos/ai_decide`.
- Server REJECTS writes when `ai_auto_decide_enabled=false` or `confidence < ai_escalate_below_confidence`. Worker must route to `/photos/escalations/open`.
- `expected_current_status` race guard on both decide and ack — 409-style mismatch = refetch + retry, not a hard error.
- `idempotency_key` recorded on every write. Phase 1: audit-only. Phase 2: server-side dedupe planned.
- Zifnab's hard rule (server-enforced): `actor_type=ai_agent` cannot resolve a `human_admin_review` escalation as approved/rejected. Only acknowledge or escalate further.

---

## Worker Phase Tickets (execution order)

| Order | # | Title |
|---|---|---|
| 1 | #339 | Wire Devon to live Xano endpoints |
| 2 | #340 | DB-driven prompts + reason codes |
| 3 | #341 | Honor moderation_settings |
| 4 | #342 | Provider chain + escalation routing |
| 5 | #346 | Zifnab autonomous review loop |
| 6 | #343 | Cleanup duplicate vocabulary constants |

---

## Acceptance Gate

Photo `13286` dry-run produces:

```json
{
  "verdict": "rejected",
  "reason_code": "not_person_photo",
  "route": null,
  "mutation_performed": false
}
```

With `auto_rejected=1`, `live_mutations=0`, `escalate=0`. This is the canonical proof.

---

## Final Review Precedence Lock

```text
1. technical/system unreadable -> retry/diagnostic no_write
2. human-safety categories -> human_admin_review
3. clear non-person/non-profile -> reject/not_person_photo
4. clear clean person/profile -> approve
5. ordinary uncertainty/borderline -> agent_review/no_write
6. agent unresolved/sensitive -> human_admin_review
```

Human-safety categories include minors, x-rated/explicit sexual content, hate/extremism, credible violence/self-harm/threats, illegal/safety-sensitive content, and unresolved agent cases. Ordinary ambiguity goes to fleet-agent (Zifnab) review first.

---

## Spec Lock

- Locked by Zifnab on 2026-04-30 after Lord Xar approval in #anewluv-dev.
- Anewluv backend implementation locked + shipped 2026-04-30 — see master handoff comment 4356630657 on #345.
- 3-tier routing + autonomous Zifnab + Discord-as-audit corrections locked via #345 correction comments.
- Worker implementation must follow GitHub issue #345 + the linked phase tickets. Do not patch from earlier drafts.

---

## Cross-references

- **Master tracker (worker):** [The-Nexus#345](https://github.com/The-Nexus-Decoded/The-Nexus/issues/345)
- **Master handoff:** [issue 345 comment 4356630657](https://github.com/The-Nexus-Decoded/The-Nexus/issues/345#issuecomment-4356630657)
- **Anewluv UI v2:** [AnewluvExpo#86](https://github.com/olalawal/AnewluvExpo/issues/86)
- **Anewluv 3-tier routing source-of-truth:** [AnewluvExpo#90](https://github.com/olalawal/AnewluvExpo/issues/90)
- **Worker code review parent:** [The-Nexus#337](https://github.com/The-Nexus-Decoded/The-Nexus/issues/337)
- **Worker phase tickets:** #339, #340, #341, #342, #343, #346
