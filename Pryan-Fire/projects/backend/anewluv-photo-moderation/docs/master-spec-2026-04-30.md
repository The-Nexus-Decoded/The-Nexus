# AI Photo Moderation — Master Spec

**Status:** Reconciled against current state 2026-04-30
**Author:** ola.lawal@gmail.com (with Claude)
**Tickets:** AnewluvExpo#83 (lookup tables), AnewluvExpo#84 (runtime settings), The-Nexus#337 (worker cleanup)
**Supersedes (selectively):** `Pryan-Fire/projects/backend/anewluv-photo-moderation/docs/implementation-spec-2026-04-30.md` for vocabulary, settings, and decision flow. Worker code architecture stays Devon's.

---

## 0. Reconciliation against current state

We did a state inventory after drafting v1 of this spec. Devon's team already shipped a meaningful chunk of the AI side, and the spec needed to be cut down. **What v2 reflects:**

### What already exists (don't rebuild)

**Xano endpoints under apigroup 162 (`moderation`):**
- `POST photos/ai_recommendation` (id 2830) — write recommendation, no finalize
- `POST photos/ai_decide` (id 2831) — AI finalize
- `POST photos/escalations/open` (id 2827)
- `GET  photos/escalations` (id 2828)
- `POST photos/escalations/ack` (id 2829)
- `GET  photos/queue` (id 2436), `POST photos/decide` (id 2437) — existing human flow

**Xano tables:**
- `photo_ai_moderation_audit` (id 162) — full structured AI audit (run_id, dry_run, moderation_*, vision_*, deterministic_checks_json, verdict, confidence, reason_code, planned_action, final_action, error_*). This is what the v1 spec called `ai_photo_assessments`.
- `photo_moderation_escalations` (id 163) — open / acknowledged / resolved / dismissed status, severity, reminders. This is what the v1 spec called `moderation_escalations`.
- `Photos` (id 12) — already extended with `ai_verdict`, `ai_confidence`, `ai_reason_code`, `ai_note`, `review_type_id`.
- `photo_review_type` (id 159) — Agent vs Human source enum.

**Worker code (`The-Nexus-Decoded/The-Nexus` @ `feat/anewluv-photo-moderation-worker`):**
- Lives at `Pryan-Fire/projects/backend/anewluv-photo-moderation/src/photo_sweeper/`.
- Modules: `cli.py`, `runner.py`, `model.py` (Mock + CodexOpenAI adapters), `moderation_contract.py`, `policy.py`, `queue.py`, `validators.py`, `deterministic.py`, `normalization.py`.
- **Currently emit-only / dry-run** — does not call any Xano endpoint. The runner reports `"/photos/decide": "not called"`. So there is nothing to "cut over from" — the cutover is "start calling the existing endpoints + DB-driven prompts."

### What's still missing (this spec creates these)

- `moderation_settings` table — runtime tunables (grace period, kill switch, confidence floor, per-run cap).
- `reason_codes` table — currently hardcoded in worker `XANO_CANONICAL_REASON_CODES` AND duplicated in the existing `moderation_keywords` table. Single source of truth not yet established.
- `review_items` table — hardcoded in worker `REVIEW_ITEMS` constant.
- 2 new `PhotoStatus` rows: `Escalated`, `Withdrawn`. Today the table only has `Uploaded`, `Approved`, `Dissaproved` (sic).
- The `/moderation/settings` read/write endpoints.
- The grace-period filter on the existing `/photos/queue` endpoint for AI callers.

### What v1 of this spec got wrong

- **"Drop `actor_key` / `actor_type`."** Wrong. That's the shared admin auth pattern across the entire moderation apigroup — humans use it on their admin endpoints too. AI and human admin already share this surface. The spec keeps `actor_key`/`actor_type` and treats it as the canonical actor distinction.
- **"Drop `/photos/ai_recommendation` / `/photos/ai_decide`."** Partially wrong. The duplication concern is real, but rather than nuking the AI endpoints (which already work), we **keep them, deprecate `ai_recommendation` if the recommendation/decide split isn't carrying its weight, and add the missing settings + lookup endpoints alongside.**
- **"Five new tables."** Wrong — only three: `moderation_settings`, `reason_codes`, `review_items`. The audit + escalations tables already exist.

---

## 1. Why this spec exists

The first cut of the AI photo moderation worker landed parallel to the existing human flow: hardcoded reason strings, its own verdict vocabulary, its own escalation pipeline. The Anewluv FE uses a different vocabulary. Two systems drifting apart is a maintenance trap.

This spec defines the architecture going forward. It captures (a) what's built, (b) what's missing, and (c) how the human and AI flows reconcile around shared lookup tables and shared settings.

---

## 2. Core principle: shared vocabulary, shared lookup tables, two actor types

**One source of truth for moderation vocabulary, settings, and verdicts.** Both human moderators and AI agents (Devon) read the same reason codes, the same review checklist, the same settings, and write the same verdict enum.

**Authentication stays as it is:** `actor_key` + `actor_type` is the established admin-side pattern across apigroup 162. Humans set `actor_type='human'`; AI sets `actor_type='ai'`. Server stamps audit rows accordingly. We're not refactoring auth.

**What "shared" means in practice:**
- Reason codes live in **one** table (`reason_codes`) keyed by `surface IN ('photo','chat','all')`. FE renders them. Worker references them. `moderation_keywords` cross-references them (no duplication).
- Review items (the per-photo checklist) live in **one** table (`review_items`). The worker prompt is *assembled from this table at run time* — not hardcoded.
- The verdict enum gains `Escalated` and `Withdrawn` rows on the existing `PhotoStatus` table. Both human and AI flow write to the same enum.
- Runtime settings (grace period, kill switch, etc.) live in **one** table (`moderation_settings`) read by both worker and admin UI.

**The duplication to fix isn't auth — it's vocabulary.** The worker hardcodes 12+ reason codes that overlap with `moderation_keywords.reason_code`. The worker hardcodes a `REVIEW_ITEMS` tuple. The worker uses verdict labels (`approve_recommendation` / `reject_recommendation`) that don't match `PhotoStatus`. **Lookup tables fix all three.**

**Why this matters beyond photos:** when chat moderation lands, `reason_codes` already has rows where `surface='chat'`. The chat worker reads from the same table. The admin chat-flag UI reads from the same table. We don't rebuild the vocabulary.

---

## 3. Vocabulary — the canonical lists

### 3.1 Photo status (extends existing `PhotoStatus` table)

Today: `Uploaded` (1), `Approved` (2), `Dissaproved` (3) [sic — keep the typo, don't break existing code].

**Add 2 rows:**

| id | status | terminal | meaning |
|---|---|---|---|
| 4 | Escalated | no | AI couldn't decide; in human-only queue |
| 5 | Withdrawn | yes | User deleted before decision |

The existing `Photos` table already has `review_type_id` joining to `photo_review_type` (Agent / Human) — that's how we tell who decided.

### 3.2 `reason_codes` (NEW table — 21-row seed)

Single shared table across all moderation surfaces. `surface` column scopes per flow.

**Seed data — 21 rows for `surface IN ('photo','all')`:**

| code | label | surface | severity | auto_reject_threshold |
|---|---|---|---|---|
| `nudity_explicit` | Explicit nudity | photo | high | 0.85 |
| `nudity_partial` | Partial nudity | photo | medium | null (escalate) |
| `sexual_act` | Sexual act | photo | high | 0.80 |
| `sexually_suggestive` | Sexually suggestive pose | photo | medium | null |
| `violence_graphic` | Graphic violence | photo | high | 0.85 |
| `weapon_displayed` | Weapon displayed | photo | medium | null |
| `drug_use` | Drug use | photo | medium | null |
| `hate_symbol` | Hate symbol | all | high | 0.90 |
| `self_harm` | Self-harm imagery | all | high | 0.85 |
| `minor_in_photo` | Minor visible in photo | all | high | 0.80 |
| `underage_concern` | Subject appears underage | all | high | 0.75 |
| `group_photo` | Multiple people, subject unclear | photo | low | null |
| `unclear_subject` | Subject not identifiable | photo | low | null |
| `celebrity_or_stock_photo` | Celebrity / stock photo | photo | medium | null |
| `object_or_landscape_only` | No person in photo | photo | low | 0.90 |
| `qr_code` | QR code present | photo | medium | 0.85 |
| `money_request` | Solicits money | all | medium | 0.80 |
| `hate_or_harassment` | Hate / harassment content | all | high | 0.85 |
| `bot_or_scam` | Bot / scam indicators | all | high | 0.85 |
| `low_quality` | Image quality too low to assess | photo | low | null |
| `duplicate` | Duplicate of another photo | photo | low | null |

**Reconciliation with existing systems:**
- Worker constant `XANO_CANONICAL_REASON_CODES` (12 codes) gets deleted in worker Phase 5. Worker reads from `/moderation/reason_codes?surface=photo` instead.
- Existing `moderation_keywords.reason_code` becomes a foreign key to `reason_codes.code` (or remains a string and we add a CHECK constraint — owner choice during migration).
- `severity` is informational for UI sorting.
- `auto_reject_threshold` = AI confidence floor for an auto-reject; `null` = "always escalate, never auto-reject on this code alone."

### 3.3 `review_items` (NEW table — 17-row seed)

What the AI is asked to look for. The worker prompt is assembled from this table (one-row DB change to add a check, no redeploy).

| code | label | applies_to | prompt_hint |
|---|---|---|---|
| `face_visible` | Face is clearly visible | photo | "Is at least one human face fully visible and unobstructed?" |
| `single_subject` | Single primary subject | photo | "Is there exactly one primary subject?" |
| `appears_adult` | Subject appears adult | photo | "Does the primary subject appear to be 18 or older?" |
| `appropriate_clothing` | Appropriate clothing | photo | "Is the subject wearing clothing appropriate for a public dating profile?" |
| `no_explicit_content` | No explicit content | photo | "Is the photo free of nudity, sexual acts, or sexually explicit content?" |
| `no_violence` | No violence | photo | "Is the photo free of graphic violence or weapons used aggressively?" |
| `no_drugs` | No drug use | photo | "Is the photo free of visible drug use or paraphernalia?" |
| `no_hate_symbols` | No hate symbols | photo | "Is the photo free of hate symbols, slurs, or extremist imagery?" |
| `underage_concern` | Subject not underage | photo | "Are you confident the subject is not a minor?" |
| `group_photo` | Not a group photo | photo | "Is this NOT a group photo where the subject is ambiguous?" |
| `unclear_subject` | Subject identifiable | photo | "Is the subject clearly identifiable (not blurred, obscured, distant)?" |
| `celebrity_or_stock_photo` | Not a celebrity/stock photo | photo | "Is this NOT a recognizable celebrity or obvious stock photo?" |
| `object_or_landscape_only` | Contains a person | photo | "Does the photo contain a person (not just object/landscape)?" |
| `qr_code` | No QR code | photo | "Is the photo free of QR codes?" |
| `money_request` | No money solicitation | all | "Is the photo free of cash, payment apps, or money-related text?" |
| `hate_or_harassment` | No hate / harassment | all | "Is the photo free of hateful or harassing content directed at any group?" |
| `bot_or_scam` | No bot / scam markers | all | "Is the photo free of obvious bot/scam markers (handle text, off-platform CTAs)?" |

**Reconciliation:** worker constant `REVIEW_ITEMS` gets deleted in Phase 5. Worker reads from `/moderation/review_items?applies_to=photo` instead.

Each item resolves to `pass` / `fail` / `unsure`. A `fail` maps to one or more `reason_codes` via `review_item_reason_map` (small join table, seeded once).

### 3.4 `moderation_settings` (NEW table — 4-row seed)

Single-row-per-key key/value table. Read by the worker on each run start (no caching across runs). Read by the admin settings UI for live edit.

| key | value | type | description |
|---|---|---|---|
| `ai_grace_period_minutes` | `5` | int | Minutes a photo must sit unreviewed before AI is allowed to pick it up |
| `ai_auto_decide_enabled` | `true` | bool | Master kill switch; when false, AI escalates every photo regardless of confidence |
| `ai_escalate_below_confidence` | `0.70` | float | AI must escalate (not auto-decide) below this confidence |
| `ai_max_decisions_per_run` | `50` | int | Per-run cap on decisions, prevents runaway loops |

---

## 4. DB schema changes

### 4.1 New tables

```sql
-- 4 seed rows
moderation_settings (
  id            serial pk,
  key           text unique not null,
  value         text not null,           -- stored as text, parsed by `type`
  type          text not null,           -- 'int' | 'bool' | 'float' | 'string'
  description   text,
  updated_at    timestamptz default now(),
  updated_by_id int references users(id)
)

-- 21 seed rows
reason_codes (
  id            serial pk,
  code          text unique not null,
  label         text not null,
  surface       text not null,           -- 'photo' | 'chat' | 'all'
  severity      text not null,           -- 'low' | 'medium' | 'high'
  auto_reject_threshold float,           -- null = never auto-reject on this code
  enabled       bool default true,
  created_at    timestamptz default now()
)

-- 17 seed rows
review_items (
  id            serial pk,
  code          text unique not null,
  label         text not null,
  applies_to    text not null,           -- 'photo' | 'chat' | 'all'
  prompt_hint   text not null,
  enabled       bool default true,
  display_order int default 0
)

-- join table; seeded by mapping items to codes
review_item_reason_map (
  review_item_id int references review_items(id),
  reason_code_id int references reason_codes(id),
  primary key (review_item_id, reason_code_id)
)
```

### 4.2 Tables that already exist — keep + extend if needed

- `photo_ai_moderation_audit` (id 162) — already has run_id, dry_run, moderation_model, vision_model_used, fallback_model, deterministic_checks_json, verdict, confidence, reason_code, planned_action, final_action, error_*. **Sufficient.** Worker writes via `POST /photos/ai_decide` and `POST /photos/ai_recommendation` (which already insert here).
- `photo_moderation_escalations` (id 163) — already has open/acknowledged/resolved/dismissed status, reminder fields, severity. **Sufficient.** Worker writes via `POST /photos/escalations/open`, admin acks via `POST /photos/escalations/ack`.
- `Photos` (id 12) — already has `ai_verdict`, `ai_confidence`, `ai_reason_code`, `ai_note`, `review_type_id`. **Sufficient.**
- `photo_review_type` (id 159) — already has Agent / Human enum. **Sufficient.**

### 4.3 Modified tables

```sql
-- PhotoStatus: add 2 rows
INSERT INTO PhotoStatus (status) VALUES ('Escalated'), ('Withdrawn');
```

That's the only schema modification to existing tables.

---

## 5. Endpoint contracts

All endpoints under apigroup 162 (`moderation`). All admin/AI endpoints use the existing `actor_key` + `actor_type` auth pattern.

### 5.1 `GET /photos/queue` — modify existing (id 2436)

**Add behavior:**
- When called with `actor_type='ai'`, filter to photos where `Photos.created_at < now() - (ai_grace_period_minutes * 1 min)` AND `PhotoStatus = Uploaded`. Never return `Escalated` rows.
- When called with `actor_type='human'` (admin), return all `Uploaded` photos regardless of age + all `Escalated` photos. Default sort: oldest first.
- Echo the live settings in the response so the worker can decide without a second call.

**Response shape (extended):**
```json
{
  "items": [
    {
      "photo_id": 12345,
      "photo_url": "https://...",
      "user_id": 789,
      "submitted_at": "2026-04-30T...",     // = Photos.created_at
      "current_status": "Uploaded",
      "review_items": [ /* full review_items rows for AI prompt assembly */ ]
    }
  ],
  "settings": {
    "ai_grace_period_minutes": 5,
    "ai_auto_decide_enabled": true,
    "ai_escalate_below_confidence": 0.70
  }
}
```

### 5.2 `POST /photos/ai_decide` — keep existing (id 2831)

Already exists. Worker calls this with `actor_key`/`actor_type='ai'`. Inputs: `photo_id, decision, reason_code, note, confidence, run_id`.

**Add server-side enforcement:**
- If `confidence < ai_escalate_below_confidence` → coerce decision to `Escalated` and route through `/photos/escalations/open` server-side.
- If `ai_auto_decide_enabled = false` → coerce decision to `Escalated`.
- Conditional update: `WHERE photo_id = ? AND PhotoStatus = Uploaded`. Returns 409 if a human or another worker beat us.
- On success: update `Photos` row + append `photo_ai_moderation_audit` (already happens) + (when escalated) write `photo_moderation_escalations` row.

**Add `idempotency_key` and `expected_current_status` body fields** to make the worker safe under retry. Server stores last 24h of seen idempotency keys.

### 5.3 `POST /photos/decide` — keep existing (id 2437)

Human admin path. No changes to body shape. Server enforces:
- `actor_type='human'` cannot pass `decision='Escalated'`.
- Same conditional update guard.

### 5.4 `POST /photos/ai_recommendation` — open question, default = keep (id 2830)

Today this writes a recommendation without finalizing. Use case: shadow mode, where Devon emits opinions but doesn't decide.

**Decision:** keep it for shadow mode, drop after Phase 5 if the recommendation/decide split isn't earning its keep. Don't refactor it now.

### 5.5 `GET /photos/escalations` — keep existing (id 2828)

Already returns the human-only queue. Add: inline the `last_ai_assessment` from `photo_ai_moderation_audit` so the human reviewer sees what Devon saw.

### 5.6 `POST /photos/escalations/open` (id 2827) and `POST /photos/escalations/ack` (id 2829)

Keep as-is. Worker calls `open`. Admin calls `ack`. No changes.

### 5.7 `GET /moderation/settings`, `PATCH /moderation/settings/:key` — NEW

Admin-only. Read all 4 keys, edit any one. Writes `updated_by_id`, `updated_at`. Live-edit; no deploy.

### 5.8 `GET /moderation/reason_codes?surface=photo|chat|all` — NEW

Public-ish (admin + AI). Returns enabled rows for the requested surface. Cached client-side for 5 min in worker, refetched on FE mount.

### 5.9 `GET /moderation/review_items?applies_to=photo|chat|all` — NEW

Same as above, for review items. Worker calls this on every run start.

### 5.10 What v1 of this spec said to delete and we are NOT deleting

- `actor_key` / `actor_type` body params — **keep.** Existing pattern across apigroup 162.
- `/photos/ai_recommendation` / `/photos/ai_decide` — **keep.** They work, the worker plans to use them, removal is a future cleanup not a Phase 1 ask.

---

## 6. AI worker behavior

### 6.1 Run lifecycle

```
1. Authenticate (existing pattern — actor_key from env, actor_type='ai').
2. GET /photos/queue?limit=ai_max_decisions_per_run
   → returns ripe photos (already filtered to age > grace period) + settings echo.
3. If queue empty: log, exit clean.
4. For each photo:
   a. Generate run_id (uuid).
   b. Run pre-model technical viability checks only: missing reference, unsupported MIME, corrupt/unreadable file, too small/too large, blank/near-blank image. Pre-model is not content moderation; do not use brittle heuristics to reject unusual person photos or classify content before vision.
   c. Fetch /moderation/review_items?applies_to=photo (cached 5 min).
   d. Assemble prompt from review_items rows by display_order.
   e. Call provider chain (primary → fallback). Existing CodexOpenAIAdapter / MiniMaxAdapter.
   f. Parse response → confidence + detailed detected_category + suggested canonical reason codes.
   g. Business-normalize before strict validation:
      - reasonably appears to be a real usable person profile photo + no banned/disallowed category → approved
      - clearly not a person/profile photo → rejected with `not_person_photo`; category labels are audit evidence only
      - policy violation such as explicit sexual content/spam/contact/hate/violence/illegal/minor-risk → reject or direct human escalation by risk level, with audit flag preserved
      - ordinary uncertainty/low confidence/bias-sensitive ambiguity → fleet-agent review before human admin
   h. Strict validator accepts only normalized allowed decisions/reasons.
   i. Determine submit action:
      - explicit valid approved/rejected → POST /photos/ai_decide with idempotency_key = run_id:photo_id and expected_current_status='Uploaded'
      - fleet-agent review or unresolved/manual_review/validator fail → no_write and route to this Discord channel for an AI agent to decide
      - direct human escalation categories → human escalation path; do not route through fleet-agent review
   j. On 409: log, skip.
   k. On 5xx: retry exponential backoff up to 3x, then defer to next run.
5. Emit run summary: counts by decision, fleet-agent review, direct human escalation, no_write, total duration, model breakdown.
```

### 6.2 Prompt assembly (deterministic, DB-driven)

```
You are reviewing a dating profile photo. For each item below, answer "pass", "fail", or "unsure".
Then give an overall confidence score (0.0-1.0) that your assessment is correct.

Items:
{for each enabled review_item row by display_order: "- {code}: {prompt_hint}"}

Respond as JSON: {"is_person_photo": true|false|"uncertain", "decision": "approve|reject|review", "reason": "ok|not_person_photo|policy_violation|uncertain", "evidence": "brief visual evidence", "confidence": 0.92}
```

Adding a new item is `INSERT INTO review_items` followed by a worker run with no code change.

### 6.3 Race / safety guards

- **Conditional update on decide:** server enforces `expected_current_status` match. 409 = "someone else got it" — log, skip.
- **Idempotency key:** `run_id:photo_id`. 24h server-side dedupe.
- **Per-run cap:** worker stops at `ai_max_decisions_per_run`. Operator raises live via settings UI.
- **Kill switch:** `ai_auto_decide_enabled=false` makes every AI decision an escalation.
- **Grace period:** server-enforced in `/photos/queue` filter, measured against `Photos.created_at` and the live `moderation_settings.ai_grace_period_minutes`. Belt-and-suspenders: worker also checks `created_at` per row.

### 6.4 What the worker writes

- `/photos/ai_decide` is called only for explicit valid `approved` or `rejected` decisions after business normalization and strict validation.
- Always for `/photos/ai_decide`: server-side fanout writes a `photo_ai_moderation_audit` row.
- If decision is `Approved` or `Dissaproved`: server updates `Photos.PhotoStatus` only.
- `Gallery`, `deleted`, and `deleted_on` are never included in worker payloads and are never mutated by this AI path.
- `manual_review`, `leave_pending`, validator fail, provider failure, missing image, or non-canonical output after normalization returns `no_write` and routes ordinary ambiguity to fleet-agent review.
- Direct human escalation is reserved for high-risk categories: minors/children, explicit sexual/X-rated, hate/extremism, violence/self-harm, illegal/safety-sensitive content, or a fleet agent that still cannot decide.

Humans never write `photo_ai_moderation_audit`. AI never writes `photo_moderation_escalations.resolved_*`.

---

## 7. FE work breakdown (AnewluvExpo)

### Phase A — Lookup-table migration (Anewluv#83)
- Stop hardcoding reason strings in `utils/moderationFormat.js` and `apis/ModerationApi.js`. Read from `/moderation/reason_codes?surface=photo`.
- Same for review items wherever they appear in admin UI.
- Add React Query hooks `useReasonCodes(surface)` and `useReviewItems(applies_to)`.

### Phase B — Settings UI (Anewluv#84)
- New admin screen: `app/admin/moderation-settings.js`.
- Toggle `ai_auto_decide_enabled`, edit `ai_grace_period_minutes` (presets: 5 / 15 / 30 / 60), edit `ai_escalate_below_confidence` (slider 0.5–0.95), edit `ai_max_decisions_per_run`.
- "I'm taking over for the next 30 minutes" pattern: bumping grace to 30 yields the queue to humans for that window.
- Show last-edited line.

### Phase C — Escalation queue UI (file as Anewluv#85 if not yet open)
- New admin screen: `app/admin/moderation-escalations.js`.
- Renders `/photos/escalations` (existing endpoint, now with `last_ai_assessment` inlined). Each card: photo + AI's per-item scorecard + AI notes.
- Resolve via `/photos/escalations/ack` (existing endpoint).
- Counter badge in admin nav for queue depth.

### Phase D — Existing moderation panel refresh
- `/photos/queue` already used by admin; verify it still renders after `Escalated` + `Withdrawn` rows ship.
- Add a status filter dropdown: `Uploaded` (default) / `Escalated`.

---

## 8. Worker work breakdown (The-Nexus#337)

The worker is currently dry-run / emit-only. The cutover is "wire up to existing endpoints + DB-driven prompts."

### Phase 1 — Wire up to live endpoints
- Stop being dry-run. `runner.py` calls `POST /photos/ai_decide` (id 2831) for finalized decisions and `POST /photos/escalations/open` (id 2827) for escalations.
- Use existing `actor_key`/`actor_type='ai'` auth (Devon's credentials in `/data/Workspace/Anewluv/.env`).
- Add `idempotency_key` + `expected_current_status` to outgoing requests.

### Phase 2 — DB-driven prompts
- On run start, fetch `/moderation/review_items?applies_to=photo` (new endpoint) and `/moderation/reason_codes?surface=photo` (new endpoint).
- Assemble prompt from `review_items` rows, not from `moderation_contract.REVIEW_ITEMS`.
- Map verdicts to `reason_codes.code` values, not from `XANO_CANONICAL_REASON_CODES`.

### Phase 3 — Settings honoring
- Honor `ai_auto_decide_enabled`, `ai_grace_period_minutes`, `ai_escalate_below_confidence`, `ai_max_decisions_per_run` on every run start. No caching across runs.

### Phase 4 — Review/escalation path
- Add a fleet-agent review layer before human admin for ordinary uncertainty.
- On low confidence, ambiguous person/profile detection, or normalized-but-not-final model output, return `no_write` and post the image + trace to this Discord channel for a fleet agent decision.
- If the fleet agent returns an explicit valid approve/reject, call `/photos/ai_decide` with the agent decision and canonical reason.
- If the fleet agent cannot decide, escalate to human admin.
- Bypass fleet-agent review and escalate directly to human admin for high-risk categories: minors/children, explicit sexual/X-rated content, hate/extremism, violence/self-harm, illegal/safety-sensitive content.
- Kill switch still prevents auto-decisions; it may route all cases to fleet-agent review or human escalation by owner setting.

### Phase 5 — Cleanup
- Delete `XANO_CANONICAL_REASON_CODES`, `REVIEW_ITEMS`, and the parallel verdict mapping from `moderation_contract.py`.
- Single source of truth = Anewluv DB.
- Optional: drop `/photos/ai_recommendation` calls if shadow mode is no longer needed.

---

## 9. Migration phases (rollout order)

1. **DB migrations** (Xano live workspace v1, owner-owned via MCP/curl):
   - Create 3 new tables (`moderation_settings`, `reason_codes`, `review_items`) + the join table + seed rows (4+21+17).
   - Add 2 new `PhotoStatus` rows.
   - Verify counts: settings=4, reason_codes=21, review_items=17.
   *(Xano branches share the same DB — no isolation benefit, so we work directly on v1.)*
2. **Endpoint rollout** (Xano live, owner-owned):
   - New: `GET /moderation/settings`, `PATCH /moderation/settings/:key`, `GET /moderation/reason_codes`, `GET /moderation/review_items`.
   - Modify existing: `GET /photos/queue` (add AI grace-period filter + settings echo), `POST /photos/ai_decide` (add server-side coercion + idempotency).
   - Smoke against Devon's actor_key + an admin actor_key.
3. **FE Phase A + B** (Anewluv#83, #84): lookup-table reads + settings UI. Ship while AI worker is still dry-run.
4. **Worker Phase 1 + 2 + 3** (The-Nexus#337): wire to live endpoints, DB-driven prompts, settings-aware. **Run in shadow mode** (every assessment → `escalated`) for ≥24h.
5. **Worker Phase 4** (The-Nexus#337): enable real auto-decisions with low cap (`ai_max_decisions_per_run=10`) and high confidence floor (`0.90`). Watch escalation queue depth.
6. **FE Phase C** (Anewluv#85): escalation queue UI ships.
7. **Tune in prod** via settings UI — no deploys.
8. **Worker Phase 5** (The-Nexus#337): delete duplicated lists from worker repo.

Each phase is a separate merge gate. Steps 4-5 require explicit owner sign-off on shadow-mode agreement rates.

---

## 10. Acceptance criteria

**Phase 1 (DB):** 3 new tables exist with seed counts matching §3. 2 new `PhotoStatus` rows present.

**Phase 2 (Endpoints):** Devon's actor_key calling `/photos/queue` returns only `Uploaded` photos older than 5 min (live setting). Admin actor_key returns all `Uploaded` + all `Escalated`. `/photos/ai_decide` 409s on `expected_current_status` mismatch. `/moderation/settings` PATCH writes `updated_by_id` + `updated_at`.

**Phase 3 (FE A+B):** No hardcoded reason strings remain in `utils/moderationFormat.js` or `apis/ModerationApi.js` (grep verifies). Settings page lets admin toggle kill switch and see the change reflected on next worker run.

**Phase 4 (Worker shadow):** Worker runs every N minutes, writes `photo_ai_moderation_audit` rows, `Photos.PhotoStatus` is unchanged for AI-touched photos (all → `Escalated`). Manual review of 50 assessments shows ≥80% agreement with eventual human decision.

**Phase 5 (Worker live):** With low cap + high floor, escalation queue depth stays bounded. Human override rate on AI auto-approves <5%.

**Phase 6 (FE C):** Escalation queue renders. Resolve writes `photo_moderation_escalations.resolved_*` and `Photos.PhotoStatus`.

---

## 11. Out of scope

- Chat moderation worker (will reuse `reason_codes` rows where `surface IN ('chat','all')` and `review_items` where `applies_to IN ('chat','all')`).
- Auto-block / auto-report by AI.
- Multi-model voting / ensemble.
- Per-user moderation history visible to the user.
- Appeals flow.

---

## 12. Open questions

1. **Should `moderation_keywords.reason_code` be FK'd to `reason_codes.code`?** Cleanest; minor migration. Owner choice during Phase 1.
2. **Keep `/photos/ai_recommendation`?** Useful for shadow mode (record an opinion without finalizing). Default: keep through Phase 5, decide in Phase 8.
3. **Per-reason confidence calibration** — single global `ai_escalate_below_confidence` vs per-code. Punt until Phase 4 data.

---

## 13. Cross-references

- Lookup tables ticket: AnewluvExpo#83 — Phase A.
- Settings ticket: AnewluvExpo#84 — Phase B.
- Worker ticket: The-Nexus#337 — Phases 1–5 (worker side).
- Escalation UI ticket: file as AnewluvExpo#85.
- Devon agent onboarding: `/data/Workspace/Anewluv/.env` on his server.
- Original worker spec: `Pryan-Fire/projects/backend/anewluv-photo-moderation/docs/implementation-spec-2026-04-30.md` (v1 of this spec superseded the vocabulary + decision-flow sections; worker code architecture stays Devon's).
