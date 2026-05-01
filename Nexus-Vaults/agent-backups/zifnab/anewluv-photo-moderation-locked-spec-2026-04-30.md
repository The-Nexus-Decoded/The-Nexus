# ANewLuv Photo Moderation — Decision Tree Spec
**Date:** 2026-04-30
**Source:** #anewluv-dev discussion
**Owner:** Zifnab (coordinator) / Devon (implementor)
**Status:** LOCKED — ticket created, awaiting assignment

---

## Overview

Replace the open-ended category-based moderation logic with two separate gates:
- **Hard-safety policy gate:** children/minors, explicit sexual content, hate/extremism, credible violence/threat/self-harm, or illegal/safety-sensitive content bypass agents and go straight to human admin.
- **Profile-photo-of-person gate:** decide whether the image is a usable photo of a person in a natural profile context.

Categories are still recorded for audit, reporting, tuning, and admin visibility. They do not replace the primary profile-photo gate, except for hard-safety categories that require human-only review.

---

## Decision Flow

```
1. TOOL / MODEL REVIEW
   ├── Is it a hard-safety category? (children/minors, x-rated/explicit,
   │   hate/extremism, credible violence/threat/self-harm, illegal/safety-sensitive)
   │   └── YES → AUTO-ESCALATE TO HUMAN ADMIN (bypass all agent review)
   │
   ├── Is it clearly not a usable profile photo of a person?
   │   └── YES → REJECT / not_person_photo
   │
   ├── Is it clearly a clean person/profile photo with no safety flags?
   │   └── YES → APPROVE
   │
   └── Uncertain / validator fail / ordinary borderline → NO_WRITE + AGENT REVIEW

2. FLEET AGENT REVIEW (Discord #anewluv-dev)
   ├── Agent resolves → submit explicit approved/rejected decision
   └── Agent cannot resolve or flags sensitivity → ESCALATE TO HUMAN ADMIN

3. HUMAN ADMIN
   └── Last resort for unresolved cases, plus hard-safety bypass cases
```

---

## Hard Safety — Auto-Escalate to Human (never touch agent)

| Category | Reason |
|---|---|
| Children/minors | Legal/ethical risk |
| X-rated / explicit sexual content | Legal/ethical risk |
| Hate / extremism symbols or imagery | Legal/ethical risk |
| Credible violence / threat / self-harm | Safety risk |
| Illegal / safety-sensitive content | Legal/ethical risk |

---

## Hard Reject — No agent, no human needed

| Category | Examples |
|---|---|
| Memes | Comic panels, macro images |
| Screenshots | App UI, web pages, conversations |
| Trading cards | Pokémon, Magic, sports cards |
| Logos / objects | Brand marks, products, artwork |
| Blank / black / blurred | Unreadable, corrupt |
| Obviously not a person | Animals, landscapes, buildings |

Hard-safety categories are not agent-review items. They route to human admin only.

---

## Manual Review — Fleet Agent or Human

| Case | Notes |
|---|---|
| Ambiguous gender presentation | Non-binary, ambiguous presentation |
| Disability / medical devices | Wheelchair, prosthetics, O2, etc. |
| Cultural / religious clothing | Headscarves, burkas, turbans, etc. |
| Nontraditional poses or aesthetics | Artistic, formal, staged |
| Low confidence face detection | Partial face, angle, occlusion |
| Uncertain / borderline | Model confidence below threshold |

Fleet agent reviews via **Discord #anewluv-dev** for ordinary uncertainty only. If the agent cannot resolve or the case becomes safety-sensitive → human admin.

---

## Auto-Approve

All of the following must be true:
- Passes pre-model deterministic checks (not banned/disallowed)
- Vision model confirms: photo of a person
- Natural profile context (face visible, not cropped into oblivion)
- No safety flags

---

## Category Logging

Categories are logged for moderation records, reporting, tuning, and admin visibility.

Hard-safety categories drive human-only routing. All other category labels are audit/policy metadata and must not override the profile-photo-of-person gate.

The ordinary approve/reject decision is driven by: **is this a usable photo of a person in a natural profile context, with no banned/disallowed safety flags?**

---

## Agent Escalation Interface

When the tool cannot determine, it posts to **#anewluv-dev** with:
- Photo ID
- Image URL or local image path if media upload fails
- Model output / reason code
- Confidence level
- Uncertainty reason
- Allowed decisions: `approved`, `rejected/not_person_photo`, `rejected/policy`, `needs_human_admin`
- `write_enabled=false` until an explicit agent decision exists

Agent responds with an explicit approved/rejected decision or escalates to human.

---

## Implementation Notes

- Tool/model clear approve/reject decisions may write only `approved` or `rejected`.
- `escalated` is routing state, not a `/photos/ai_decide` mutation.
- Validator fail / ordinary uncertainty returns `no_write` and routes to agent review.
- Agent decisions may submit only explicit `approved` or `rejected` outcomes.
- Hard-safety categories bypass agent review and route human-only.
- Humans are last resort for ordinary uncertainty, but first stop for hard-safety categories.


---

## Spec Lock

Locked by Zifnab on 2026-04-30 after Lord Xar approval in #anewluv-dev.

Implementation must follow GitHub issue #345. Do not patch from earlier drafts.


## Final Review Precedence Lock

Implementation review path precedence is locked as:

```text
1. technical/system unreadable -> retry/diagnostic no_write
2. human-safety categories -> human_admin_review
3. clear non-person/non-profile -> reject/not_person_photo
4. clear clean person/profile -> approve
5. ordinary uncertainty/borderline -> agent_review/no_write
6. agent unresolved/sensitive -> human_admin_review
```

Human-safety categories include minors, x-rated/explicit sexual content, hate/extremism, credible violence/self-harm/threats, illegal/safety-sensitive content, and unresolved agent cases. Ordinary ambiguity goes to fleet-agent review first.
