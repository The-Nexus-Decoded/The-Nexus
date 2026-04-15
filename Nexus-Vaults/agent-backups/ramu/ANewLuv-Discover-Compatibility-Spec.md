# ANewLuv Discover, Compatibility, and Match Flow Spec

Status: Drafted from locked channel decisions on 2026-04-10
Owner: Product handoff for Lord Xar, Paithan, Rega, and Zifnab

## Goal
Lock the user flow for Discover so the product clearly separates:
- pre-match compatibility evaluation
- mutual-match celebration
- post-match conversations

## Core Product Split
- **Check Compatibility** = pre-match evaluation feature
- **Match screen** = immediate mutual-match confirmation
- **Matches tab** = post-match conversations and relationship state

## Primary UX Rules, Locked
1. **Like / Pass stay primary** on the profile card.
2. **Check Compatibility stays secondary**, optional, and available on every profile.
3. **If Like produces a mutual match**, open the **Match screen immediately**.
4. **If Like does not produce a mutual match**, advance to the next profile and show a light transient toast, for example `Liked`.
5. **Pass** advances silently to the next profile.
6. **Matches tab stays** as its own persistent destination for post-match conversations.
7. **Compatibility does not replace Matches** because they solve different jobs.

## Discover Screen, Full Flow

```text
[DiscoverScreen — Profile Card]
         |
         |--- [Check Compatibility] ---> [CompatibilityResultScreen]
         |                                  (score %, Why You Match, shared preferences)
         |                                       |
         |                                       |--- [Back to Discover]
         |
         |--- [Like / Pass]
         |         |
         |         |--- Like + mutual ------> [MatchScreen]
         |         |                            (celebration -> Start Conversation / Keep Swiping)
         |         |
         |         |--- Like + not mutual --> next profile + light "Liked" toast
         |         |
         |         |--- Pass ----------------> next profile, no confirmation
         |
         |--- [Bottom Nav]
                   |--- Discover (current)
                   |--- Matches -----------> [MatchesScreen]
                   |                          (new matches, active conversations, waiting on reply)
                   |--- Profile -----------> [ProfileScreen]
```

## Empty Discover State

```text
[DiscoverScreen — Empty State]
         |
         |--- "No one new right now"
                 |
                 |--- expand radius / adjust preferences
                 |--- retry later
                 |--- go to Matches
                 |--- go to Profile
```

## Screen Responsibilities

### 1. DiscoverScreen
Purpose: Fast browse and decision surface.

Must show:
- profile photo
- name, age, and basic identity context
- primary actions: **Like**, **Pass**
- secondary action: **Check Compatibility**

Should stay fast:
- do not force compatibility before every decision
- do not replace swipe actions with compatibility actions

### 2. CompatibilityResultScreen
Purpose: Optional deeper proof before the match.

Must show:
- compatibility score
- why-you-match reasons
- shared preferences or aligned values
- clear return or next-step action

Can be accessed:
- before Like
- after profile view
- whenever the user wants more evidence

### 3. MatchScreen
Purpose: Immediate mutual-match event.

Triggered only when:
- user Likes a profile
- backend returns `isMatch: true`

Must show:
- celebration moment
- clear mutual confirmation
- primary CTA: **Start Conversation**
- secondary CTA: **Keep Swiping**

### 4. MatchesScreen
Purpose: Persistent post-match inbox and relationship state.

Should group:
- new matches
- active conversations
- waiting on reply

Must remain separate from compatibility because it serves the post-match stage.

## Decision Tree

### Check Compatibility
- Always available on every profile
- Optional
- Does not block Like / Pass

### Like
- Call match-check logic / API
- If `isMatch: true` -> open MatchScreen immediately
- If `isMatch: false` -> show light toast and advance to next profile

### Pass
- advance to next profile
- no toast
- no extra confirmation

## Copy and Interaction Notes
- Discover should stay quick and low-friction.
- Compatibility should be available, not forced.
- A non-mutual Like should confirm the tap worked, but should not feel like a major event.
- The Match screen should only appear on confirmed mutual, never as a button users hunt for.

## Backend / Data Implications

### Needed for CompatibilityResultScreen
- compatibility score
- why-match explanation payload
- shared preference fields
- basic profile metadata

### Needed for MatchScreen
- mutual match result
- matched user name and image
- route target for conversation

### Needed for MatchesScreen
- list of matches
- conversation state
- unread / waiting indicators
- recency ordering

## Implementation Path, Locked
- **Paithan** should build directly from the 7 reference designs already posted in the thread.
- Do **not** continue the broken image-generation loop for UI mockups.
- Reference design direction should stay consistent with the existing pink/white compatibility visual language.

## Reference Inputs Mentioned In Thread
- 7 original reference designs posted in channel by Rega
- prior working HTML references used during review:
  - `/tmp/first-six-match-template-all-v5.html`
  - `/tmp/first-six-match-template-v5.html`
  - `/tmp/first-six-92-v5.html`
  - `/tmp/first-six-78-v5.html`
  - `/tmp/first-six-55-v5.html`
  - `/tmp/first-six-28-v5.html`
  - `/tmp/first-six-15-v5.html`
  - `/tmp/first-six-5-v5.html`
  - `/tmp/match-v5-tier-90.html`
  - `/tmp/discover-empty-state.html`

## Final Summary
The flow is:
1. Browse a profile in Discover
2. Optionally check compatibility
3. Like or Pass
4. If mutual, show Match screen immediately
5. If not mutual, show light confirmation and keep browsing
6. Use Matches tab later for persistent post-match conversations
