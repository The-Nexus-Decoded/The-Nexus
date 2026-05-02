# ANewLuv Photo Moderation System

**Status:** Living system document as of 2026-05-01  
**Repo path:** `Pryan-Fire/projects/backend/anewluv-photo-moderation/`  
**Canonical branch for worker stack:** `feat/anewluv-photo-moderation-worker`  
**Coordinator:** Zifnab  
**Worker builder:** Devon  
**Backend/Xano authority:** Lord Xar

This document explains the full ANewLuv photo moderation system: what exists in Xano, what the worker does, how AI decisions are controlled, when humans are involved, and how the phase tickets fit together.

The short version: **AI is the primary reviewer for ordinary photo moderation.** The worker can auto-decide standard cases, but it must obey live admin settings, use DB-driven policy data, fail closed when providers break, and escalate serious or uncertain cases.

No swamp-walking.

---

## 1. Current canonical decision

Lord Xar settled the A/B ambiguity in #337.

The chosen path is **Path B: AI-primary moderation**.

That means:

- AI owns the standard review path.
- AI can auto-approve or auto-reject ordinary cases when policy, confidence, provider output, and settings allow it.
- Serious categories route to human admin review.
- Uncertain, low-confidence, invalid, or provider-failed cases escalate instead of guessing.
- Humans are the exception / override / audit path, not the default path for every photo.
- Discord is audit visibility only unless a ticket explicitly says otherwise.

The rejected path was **Path A: recommendation-only for all cases**. That model is no longer the implementation target for v1.

---

## 2. What #337 decided

#337 was the architecture review ticket. It asked whether the worker had the right shape before the rest of the build continued.

It resolved three questions:

1. **Can AI decide, or only recommend?**  
   AI can decide normal cases. It escalates serious/uncertain cases.

2. **Which verdict vocabulary is canonical?**  
   Xano is canonical. Worker writes use the Xano decision vocabulary: `approved` or `rejected` for `/photos/ai_decide`. Escalation is not a decision word; it routes through `/photos/escalations/open`.

3. **Where do reason codes and review items live?**  
   Xano lookup tables are canonical. The worker reads them live instead of carrying duplicate Python lists.

#337 is closed. Active work moved into phase tickets.

---

## 3. Ticket map

| Ticket | Status | Meaning |
|---|---:|---|
| #337 | Closed | Master/code-review decision. AI-primary path chosen; phase split created. |
| #339 | Closed | Worker calls live Xano endpoints first. This is the base for DB-driven behavior. |
| #340 | Closed | DB-driven prompts and reason codes. Worker reads live review items/reason codes. |
| #341 | Closed | Live `moderation_settings` control panel wiring. Worker obeys settings every run. |
| #342 | Open | Provider chain + escalation routing. Worker must fail closed. |
| #343 | Open | Delete duplicate vocabulary constants after live DB reads are proven. |
| #346 | Open | Zifnab autonomous agent-review loop for `agent_review` escalations. |
| #344 | Draft | Full worker stack PR to `main`; intentionally evidence-blocked until stack proof is complete. |
| #320 | Later / Zifnab-owned | Final Zifnab-owned closure/integration lane. |

Crypto/dashboard work is outside this lane. If #297 appears in repo-wide PR lists, ignore it for Devon's ANewLuv photo moderation queue.

---

## 4. System roles

### AI worker: Devon

Devon is the photo moderation worker. It fetches queued photos, checks live settings, calls the provider chain, validates output, writes AI decisions or opens escalations, and emits audit evidence.

Devon must not assume stale policy. Each run reads live settings and lookup data.

### Zifnab review tier

Zifnab handles the autonomous agent-review tier in #346. This tier polls `agent_review` escalations, decides through Zifnab's own tool/model path, writes the result by API, then posts a Discord summary for audit visibility.

Discord is not the decision gate. The API write is authoritative.

### Human admins

Human admins handle serious cases, hard safety issues, manual overrides, appeals, and audit. They are not the default reviewer for ordinary photos.

### Xano backend

Xano owns the canonical moderation state: endpoints, lookup tables, settings, audit rows, escalation rows, and final photo status.

---

## 5. Core Xano objects

The system uses apigroup 162, `moderation`.

### Existing endpoints

| Endpoint | Purpose |
|---|---|
| `GET /photos/queue` | Returns candidate photos and echoes live settings / lookup payloads when available. |
| `POST /photos/ai_decide` | AI finalizes a standard moderation decision. |
| `POST /photos/ai_recommendation` | Legacy/recommendation endpoint; not the main target for AI-primary v1 decisions. |
| `POST /photos/escalations/open` | Opens an escalation when AI should not decide. |
| `GET /photos/escalations` | Lists escalations for human or agent review. |
| `POST /photos/escalations/ack` | Acknowledges/resolves an escalation decision. |
| `POST /photos/decide` | Existing human decision flow. |

### Existing tables

| Table | Purpose |
|---|---|
| `Photos` | Source photo rows and AI-visible columns such as `ai_verdict`, `ai_confidence`, `ai_reason_code`, `ai_note`, `review_type_id`. |
| `photo_ai_moderation_audit` | Structured AI audit trail for every run/write path. |
| `photo_moderation_escalations` | Escalation queue with route, status, severity, reminders, and ownership state. |
| `photo_review_type` | Records whether a decision came from Agent or Human review. |
| `PhotoStatus` | Canonical photo state enum. Existing typo `Dissaproved` is preserved to avoid breaking current code. |

### Lookup/settings tables

| Table | Purpose |
|---|---|
| `moderation_settings` | Live operator settings: kill switch, confidence floor, grace period, per-run cap, agent review switch, audit channel id. |
| `reason_codes` | Canonical moderation reason vocabulary. Worker validates model output against this table. |
| `review_items` | Canonical checklist used to assemble the AI prompt every run. |
| `review_item_reason_map` | Maps checklist failures to canonical reason codes. |

---

## 6. Moderation settings: the control panel

#341 made the worker obey `moderation_settings` on every run.

The worker must not cache these settings across runs. An admin should be able to change a setting in Xano and affect the next worker run without redeploying code.

| Key | Type | Meaning |
|---|---|---|
| `ai_grace_period_minutes` | int | Minimum photo age before AI can pick up the photo. |
| `ai_auto_decide_enabled` | bool | Master AI decision switch. When false, skip model calls and escalate. |
| `ai_escalate_below_confidence` | float | Confidence floor. Below this, escalate instead of deciding. |
| `ai_max_decisions_per_run` | int | Per-run cap, including `0`. Prevents runaway decision loops. |
| `agent_review_enabled` | bool | Enables Zifnab agent-review tier. When false, ordinary uncertainty bypasses Zifnab and goes to humans. |
| `agent_review_discord_channel_id` | string | Audit-log channel id. Empty means no Discord post; API workflow still runs. |

### Plain behavior

If `ai_auto_decide_enabled=false`, Devon does not call the model and does not decide photos. It escalates them.

If `ai_max_decisions_per_run=5`, Devon stops after 5 decision attempts. If it is `0`, Devon processes no decisions.

If `ai_grace_period_minutes=30`, Devon skips photos newer than 30 minutes.

If confidence is below `ai_escalate_below_confidence`, Devon escalates before `/photos/ai_decide`.

Every run output includes `settings_echo`, so reviewers can prove what rails were active.

---

## 7. DB-driven prompts and reason codes

#340 made policy data live instead of hardcoded.

Before #340, `moderation_contract.py` contained duplicate Python lists for review items and reason codes. Those lists drifted away from Xano.

After #340, each run reads:

- `GET /moderation/review_items` — the checklist used to build the AI prompt.
- `GET /moderation/reason_codes` — the allowed vocabulary used to validate AI output.

Adding a new photo check should be a Xano insert, not a worker redeploy.

### Review items

Review items tell the model what to inspect: face visibility, single subject, adult appearance, explicit content, hate symbols, QR codes, scam markers, money solicitation, and similar photo policy checks.

The worker assembles prompt text from live rows. If no rows come back, the worker must fail closed rather than invent local policy.

### Reason codes

Reason codes are the canonical explanation vocabulary. They are used by the frontend, backend, worker validation, audit rows, and escalation routing.

The worker may keep small internal maps for provider category translation, but the application-level reason vocabulary belongs to Xano.

#343 removes the old duplicate constants after the live path is proven.

---

## 8. Normal review flow

The standard AI-primary run looks like this:

```txt
start run
  -> GET /photos/queue
  -> read settings_echo / live settings
  -> read review_items and reason_codes if not included in queue payload
  -> apply grace period and per-run cap
  -> if ai_auto_decide_enabled=false: escalate without model call
  -> inspect deterministic image facts
  -> run provider chain
  -> validate provider output
  -> compare confidence to settings floor
  -> decide or escalate
  -> emit audit evidence
```

The worker only writes final standard decisions through `/photos/ai_decide`.

Escalation is separate. If the worker cannot safely decide, it calls `/photos/escalations/open`.

---

## 9. Provider chain and fail-closed rule

#342 gives the worker a real provider chain instead of one magic model call.

The intended shape:

```txt
try primary moderation/vision provider
if it fails, times out, rate-limits, or returns invalid output -> try configured fallback
if no provider can safely decide -> escalate
if confidence is below settings floor -> escalate
if serious/policy-sensitive category appears -> escalate
```

The acceptance rule is simple: **provider chain must fail closed.**

That means:

- No silent “model failed, but we guessed anyway.”
- No approval when provider output is missing.
- No approval when provider output is invalid JSON or invalid vocabulary.
- No final decision when confidence is below the configured floor.
- No ordinary auto-decision for hard-safety categories.
- Every provider attempt, fallback, and escalation reason appears in audit output.

If the chain runs out of rope, it rings the bell.

---

## 10. Stage 1 / Stage 2 provider model

#342 distinguishes two signal types.

| Stage | Provider class | Example | Signal |
|---|---|---|---|
| Stage 1 | Moderation API | `omni-moderation-latest` | Calibrated safety categories and scores. |
| Stage 2 | Vision LLM judge | GPT vision / MiniMax-VL | Structured JSON against the 17-item app checklist. |

Stage 1 is cheap, fast, and calibrated for broad safety categories.

Stage 2 understands the ANewLuv-specific profile-photo checklist but its self-reported confidence is not calibrated in the same way.

### Hard rule

Auto-reject requires a calibrated provider somewhere in the chain unless the reject is a narrow business-rule reject such as clearly not being a person photo.

Vision-only paths may approve clean ordinary photos when confidence and settings allow. Vision-only paths should be conservative on rejects and escalate when safety confidence is not backed by Stage 1.

---

## 11. Escalation routes

Escalation is not failure. It is the safe path when AI should not finalize.

| Route | Used when |
|---|---|
| `agent_review` | Ordinary uncertainty, invalid provider output, provider chain failure, Stage 2 unavailable, low confidence, or cases suited for Zifnab review. |
| `human_admin_review` | Serious/policy-sensitive/hard-safety cases, explicit human-only categories, appeals, overrides, or when `agent_review_enabled=false`. |

### Human-admin examples

Route to humans for minor/underage concerns, explicit sexual material, self-harm imagery, hate symbols or severe hate content, graphic violence, and any category Lord Xar marks human-only.

### Agent-review examples

Route to Zifnab for ambiguous profile quality, unclear subject, low confidence, provider-chain failure, uncertain image type, and ordinary cases where Devon should not directly decide.

---

## 12. Decision vocabulary

Worker writes to `/photos/ai_decide` use:

```txt
approved
rejected
```

Escalation uses `/photos/escalations/open`; it is not encoded as `decision=escalated`.

Provider-facing prompt vocabulary may contain model-friendly labels, but the worker must normalize them before API writes.

Do not create parallel verdict words in Python, Discord, or docs. The backend enum wins.

---

## 13. Reason-code handling

The worker receives provider output, normalizes provider categories, then validates the final reason code against live Xano reason codes.

If the provider returns an unknown reason code, the worker should not write a guessed final decision. It should route to escalation with an audit note explaining the invalid vocabulary.

Small stable translation maps are allowed for external provider categories, such as OpenAI moderation category names. Application policy lists are not allowed to drift in Python.

#343 burns down the remaining duplicate constants.

---

## 14. Deterministic checks

The worker also runs deterministic image checks before or alongside provider review.

Current checks include things like image reference presence, supported reference type, file size, dimensions, blank/solid-color score, darkness score, and sharpness/edge score.

These checks should never replace policy review. They provide evidence and can force review/escalation for unusable images.

---

## 15. Audit expectations

Every meaningful run should leave enough evidence for a reviewer to reconstruct what happened.

Run output should include:

- `run_id`
- `settings_echo`
- provider route used
- provider attempts
- fallback model if used
- deterministic checks
- normalized verdict
- confidence
- reason code
- planned action
- final action
- escalation route when applicable
- error class / error note when provider or Xano calls fail
- idempotency key for writes

Discord summaries should be short. GitHub issue/PR evidence should be complete.

---

## 16. Idempotency and race guards

Live writes must be safe under retries and concurrent runs.

Expected write safety:

- Use `idempotency_key` on `/photos/ai_decide` and `/photos/escalations/open`.
- Include `expected_current_status: 1` for `Uploaded` photos.
- Treat server race responses as skip-and-continue, not as fatal worker crashes.
- Back off on transient 5xx errors, then defer to the next run.
- Do not write decisions for deleted, withdrawn, already-approved, already-rejected, or already-escalated photos.

The worker already treats expected-status conflicts as race skips through `XanoRaceSkip`.

---

## 17. Dry-run versus live run

Dry-run exists to prove behavior without mutating production state.

Dry-run should still fetch live queue data if configured, read live settings, assemble prompts, run providers or mocks, and produce the same planned action evidence.

Dry-run must not call final write endpoints.

Live run may call:

- `/photos/ai_decide`
- `/photos/escalations/open`

Live run must not call legacy human-only decision endpoints as a shortcut.

---

## 18. Zifnab autonomous review loop (#346)

#346 adds the second AI tier.

Devon opens `agent_review` escalations when it cannot safely decide but the case does not require immediate human admin review.

Zifnab then:

1. Polls `GET /photos/escalations?actor_type=ai_agent&status=open&route=agent_review`.
2. Reviews each escalation through Zifnab's model/tool path.
3. Writes the decision through `POST /photos/escalations/ack` with race guards and an idempotency key.
4. Posts a Discord result summary for audit visibility.

No human-in-the-loop is required for ordinary `agent_review` cases. Humans remain the fallback for hard safety, overrides, appeals, disabled agent-review setting, or cases Zifnab cannot safely decide.

---

## 19. What humans see

Human admins should see:

- uploaded photos waiting for normal human review if AI is disabled or bypassed;
- escalated photos routed to human admin review;
- audit information explaining why AI escalated;
- final AI decisions with confidence/reason evidence;
- settings controls for the AI worker and agent review tier.

Humans should not have to read raw provider JSON to understand a decision.

---

## 20. Safety rails

The worker must never:

- expose secrets in logs, Discord, GitHub, or docs;
- delete photos;
- mutate schema;
- bypass `actor_key` / `actor_type` auth;
- approve a photo when provider output is missing or invalid;
- approve a photo below confidence floor;
- silently ignore provider failures;
- invent reason codes;
- decide serious/hard-safety categories as ordinary cases;
- call human-only endpoints as the AI worker;
- treat Discord messages as authoritative moderation decisions.

The worker should prefer escalation over false certainty.

---

## 21. Current open work

### #342 — provider chain + escalation routing

This ticket makes the reviewer fail closed. It adds real fallback behavior and proves provider failures route safely.

Required proof:

- Stage 1 clean path works.
- Stage 1 hard safety routes to `human_admin_review`.
- Stage 1 inconclusive calls Stage 2.
- Stage 1 unreachable falls back to Stage 2.
- Both providers unreachable opens escalation with `provider_chain_failed`.
- Vision-only chain never auto-rejects hard safety without calibrated support.
- Audit shows provider attempts and escalation reason.
- #341 settings still govern the run.

### #343 — cleanup duplicate vocabulary constants

This deletes stale constants from `moderation_contract.py` after live DB reads are proven.

The target is: Xano lookup tables are the source of truth. Python may keep internal logic sets, but not duplicate app vocabulary lists.

### #346 — Zifnab autonomous review loop

This wires the agent-review queue. Zifnab polls, decides, writes by API, and posts an audit summary.

### #344 — stack PR

This stays draft/evidence-blocked until #342, #343, and #346 have enough proof.

---

## 22. Operator runbook

### If AI should stop deciding immediately

Set `ai_auto_decide_enabled=false`.

Expected result: next Devon run skips model calls and escalates instead of deciding.

### If AI is running too many decisions

Lower `ai_max_decisions_per_run`.

Set it to `0` for a soft stop while keeping the rest of the worker path inspectable.

### If photos are being reviewed too soon

Raise `ai_grace_period_minutes`.

### If AI is too aggressive

Raise `ai_escalate_below_confidence` or disable `agent_review_enabled` to send uncertainty straight to humans.

### If provider reliability drops

#342 behavior should handle this by trying fallback providers and escalating when the chain cannot safely decide.

If escalation volume spikes, inspect provider attempt logs and audit rows before changing policy.

---

## 23. Evidence pattern for every phase PR

Each phase PR should report:

- PR link
- merge commit after merge
- exact behavior enforced
- test command and result
- issue closure note
- any open risk or follow-up ticket

#341 used this pattern well:

```txt
PYTHONPATH=src python3 -m unittest tests.test_smoke -v
63 tests OK
```

Keep that pattern. Tiny breadcrumbs save whole expeditions.

---

## 24. Glossary

**AI-primary** — AI handles standard reviews and writes decisions when safe.

**Fail closed** — when uncertain or broken, escalate instead of guessing.

**Hard safety** — categories like minors, explicit sexual content, severe hate, self-harm, and graphic violence that require human admin review.

**Agent review** — Zifnab's autonomous second-tier review path for ordinary uncertainty.

**Human admin review** — human escalation path for serious, policy-sensitive, appeal, override, or disabled-agent cases.

**Settings echo** — the settings snapshot included in run output proving which live controls governed that run.

**DB-driven prompt** — prompt assembled from live Xano `review_items`, not a hardcoded Python checklist.

**Reason code** — canonical Xano vocabulary value explaining a moderation outcome.

---

## 25. Source docs and tickets

Primary docs in this repo:

- `docs/master-spec-2026-04-30.md`
- `docs/implementation-spec-2026-04-30.md`
- `docs/existing-path-ai-behavior-gap-map-2026-04-30.md`
- `docs/escalation-owner-ack-contract-2026-05-01.md`
- `docs/cron-lock-idempotency-2026-05-01.md`

Primary GitHub tickets:

- #337 — architecture decision / phase split
- #339 — live endpoint calls
- #340 — DB-driven prompts/reason codes
- #341 — live settings enforcement
- #342 — provider chain and escalation routing
- #343 — duplicate vocabulary cleanup
- #346 — Zifnab autonomous review loop
- #344 — draft stack PR

