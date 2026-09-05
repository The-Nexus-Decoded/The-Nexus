# Shared Narrative Autonomy and Death Gate Continuity Policy

Revision: 2026-09-05-narrative-v1
Applies to ALL SoulDrifter agent hosts and assigned narrative/content consumers.
Authority: latest owner direction; parent campaign #428, content #498, production program #501.

## 1. Owner direction and precedence

The owner explicitly authorizes agents to improve draft quests when they do not fit established lore, local circumstances, or the continuing campaign. Do not preserve an arbitrary draft merely because an earlier assistant listed it, and do not pause for approval of every routine narrative correction.

The intended narrative is an identifiable **fan continuation of The Death Gate Cycle**, not an unrelated fantasy setting with all recognizable references removed. Use frequent, purposeful callbacks to researched book events, named places, named characters, peoples, institutions and their consequences. New SoulDrifter events, characters and Thalenyr material remain the project's continuation, not a claim of official book canon.

This is an OWNER_LOCKED creative direction and delegation for the development/POC lane. It supersedes older blanket instructions to anonymize every book reference, restrict the project to unnamed inspiration, or obtain preapproval for each draft wording/objective adjustment. It does NOT supersede source accuracy, confidentiality, rights/release review, protected worktrees/checkpoints, spend controls, role boundaries, or explicit owner-locked world/gameplay facts.

Do not claim that the current game premise, including any sealing, imprisonment, elapsed time or new realm formation, is the literal published ending without source evidence. Separate the verified ending/history from owner-authored continuation premises and any deliberate alternate-continuity fork. A discovered contradiction must be surfaced, not hidden behind the word canon.

## 2. The authority is in SEA, not a particular agent handoff

Common home:

`Chelestra-Sea/infra/playbooks/game-development/`

- `universal-game-production/`: genre-agnostic specification, setup, tooling, production, validation and handoff methods.
- `souldrifter-production/`: the shared SoulDrifter runbook, current direction, context/readset, source map, narrative policy, configs, templates and ticket kickoffs.
- Actual game-bible, source research, region/map/actor records and runtime contracts remain at their existing indexed paths/refs, including the game implementation tree. The SEA readset routes to their contents; do not create conflicting copies merely to put everything under one directory.
- `source-bundle/` preserves historical source/template material. Use its original path/hash index; archives do not override newer explicit decisions.
- Claude, Codex, M3 and other host-specific handoffs are adapters to this common authority, not owners of separate lore or production truth.

Read `PROJECT_CONTEXT_READSET.md`, the actual underlying lore/game/runbook sources and the appropriate production modules. This policy does not replace the full specification/build/setup process. Tools can remain cached; source comprehension cannot be assumed from a receipt or filename.

## 3. What agents may revise without asking for every edit

Within the assigned ticket/worktree and approved chapter/system scope, the narrative/content worker may:

- rewrite draft quest titles, descriptions, dialogue, journal entries, motivations and transitions;
- strengthen cause-and-effect links between local problems, NPC goals and the larger campaign;
- replace a weak fetch/kill objective with a better supported investigation, rescue, repair, delivery, negotiation or exploration objective using existing supported mechanics;
- reorganize draft prerequisites and optional branches when the main path remains reachable and the required learning/progression outcomes are retained;
- adjust the draft quest giver or turn-in role to a more plausible existing local character, preserving recurring identity and coordinating changes with asset/placement owners;
- relocate draft tasks between already approved reachable location/socket options; record unresolved placement until the environment owner supplies a valid socket;
- add sourced book callbacks and original follow-up consequences throughout dialogue, journals, environmental objects, rumors and quest outcomes;
- replace a draft quest that cannot be reconciled, with a source-backed equivalent serving its chapter purpose and classification;
- run local draft-content tests and implement those revisions where that worker already owns authorized content implementation.

Current chapter counts, stage sequence, level/learning outcomes, inventory/economy rules, Human-only Heartvale social population, separate realm identities, combat-mode requirements, source rights, saved progress and explicit owner locks remain constraints. Do not change those as a convenient narrative edit. Routine revisions must not require a fresh model batch or change another worker's files without coordination.

Final owner content review still occurs, but **review is a checkpoint after a coherent revised draft/playable pass, not a stop at every line of dialogue**. Report a batched before/after change digest. Preserve the previous draft and reasons for change.

## 4. Role boundaries and escalation

The authorization follows a role's actual assignment:

- Narrative/content worker: may apply the above draft revisions directly in its owned files.
- Research-only #429/#430 work: may research and revise narrative proposals/continuity packets, not gameplay code, reward tables or canonical publication.
- #510 NPC worker: may improve provisional biography, motivation, role and source-grounded visual brief; coordinate quest/cast changes and do not rebuild already accepted art unnecessarily.
- #502 schema worker: implements revision/source-reference support and validation fixtures; it does not become the campaign writer or hard-code this franchise in the generic engine.
- #509/#512 environment/test worker: may improve owned environmental storytelling and log quest-fit problems, but does not overwrite another lane's quest graph or spawn a new cast by surprise.
- Independent verifier: evaluates the source and changed work independently; does not repair and self-certify it.

Escalate only the consequential or genuinely unresolved decision: retconning a book fact or owner lock; changing chronology/realm cosmology; a named book character's new fate, direct participation or location; new regional peoples; chapter finale/endgame implications; unsupported mechanics; material changes to XP/economy/capacity; destructive quest-ID/save migration; significant new asset cost; merge/deployment; public/commercial release.

A named book-character mention is not the same decision as physically placing that character in Heartvale. First-party NPC cameo/location changes must be checked for timeline, survival, travel, local population and owner direction. Ordinary accurate references do not require a separate owner interruption.

## 5. Source-to-continuation workflow

For every substantial callback or revised quest:

1. Read the relevant lawful source or approved source extraction, the project lore packet and latest owner decisions.
2. Identify the verified historical fact and its source: book/title plus chapter or scene; edition/page only when actually available. Never invent a page reference or claim to have read an unavailable book.
3. Identify the continuation date/phase and local point of view. What happened in the book, what happened later in this project, and what this NPC merely believes are separate fields.
4. Explain how this history affects the present task: motivation, trade, fear, faith, inherited responsibility, lost knowledge, faction disagreement, travel or a future decision.
5. Write new dialogue/action/quest text rather than reproducing book passages or reconstructing an existing book scene as a replacement for reading it.
6. Validate lore, geography, NPC knowledge, prerequisites, local power level and consequences; then validate implementation dependencies and saves.
7. Record the revision, tests and unresolved questions in the existing ticket/quest ledger using the companion record template.

Use explicit classifications:

- `BOOK_CANON_VERIFIED`: directly supported source fact, not just an internet or previous-agent recollection.
- `OWNER_CONTINUATION_PREMISE`: explicit project premise added by the owner.
- `PROJECT_CANON_APPROVED`: reviewed SoulDrifter continuation detail.
- `AGENT_REVISED_DRAFT`: authorized working revision pending final owner review.
- `INFERENCE`: plausible interpretation not directly established.
- `DIEGETIC_BELIEF_OR_RUMOR`: what a character/document claims; record the separate underlying truth status.
- `UNKNOWN_CONFLICT`: missing, inconsistent or unresolved evidence.

Aliases to existing source/canon enums may be provided by the schema owner. Do not break existing data solely to rename these statuses.

## 6. Callback density and placement

The owner wants MANY connections, spread across the experience. Do not hide the entire continuity in one optional codex page or replace it with generic unnamed ancient powers.

Create an act/quest/location callback coverage map before the narrative pass. Main quests must connect meaningfully to the continuing campaign; side and optional quests should add history, local consequences and different perspectives. Each major act needs recognizable book-continuity anchors, distributed across more than one presentation channel. Not every collection objective needs to name a famous person, and repeated name-dropping is not immersion.

Suitable channels:

- NPC greetings, conversations, disagreements and debriefs;
- quest descriptions, journals, completed-quest consequences and later callbacks to the player's own decisions;
- letters, trade records, memorials, inscriptions, local histories, family stories and objects with documented provenance;
- map descriptions and traveler accounts of named book places;
- remembered or disputed accounts of named book characters and events;
- scene/cutscene context, environmental storytelling and later-region hooks.

Names such as the established source realms, Nexus/Labyrinth, Sartan/Patryn, or other source characters/places should be retained where accurate and relevant. The use of a source name does not automatically verify a new claim about it. Verify identities, spelling, relationships, whereabouts, knowledge and chronology against the source. Do not casually equate the project's Drakkin with a book species without the relevant canon decision.

For each callback record: source entity/event, supporting source, local speaker/object, reason this information is known, present quest purpose, spoiler/reveal stage, continuity status and later payoff. A poorly informed villager can have a mistaken belief only if deliberately authored as such; rumors are not an excuse for accidental lore errors.

## 7. Heartvale-specific guardrails

Heartvale's settlement residents and authored social NPCs remain Human-only. References to other peoples, distant book locations and historical characters are encouraged without physically populating the starting region with them. Monsters/wildlife and a nonhuman developer test avatar remain separate approved cases.

Keep beginner gameplay at the approved power level. A story about advanced traditions is not permission to grant their powers to starting characters or make a late-game ruler the opening enemy. Preserve First Breach-to-Heartvale continuity, local map semantics and current environment ownership.

Preserve the global purpose: increasing personal capability, recovering knowledge, building alliances, stabilizing realms, restoring access/infrastructure and acquiring resources/authority to face the possible return of ancient powers on more equal footing. Regions remain distinct; this is not an instruction to recombine them.

Draft causes such as an Echo Wound, quest names and incidental NPC names may be improved. Do not silently canonize a guessed cause or overwrite an explicitly approved finale. Maintain chapter coverage, optional/main separation, accessible paths, progression budgets and the existing quest-ID/save contract.

## 8. Revision record and technical acceptance

Use `templates/quest-narrative-revision-record.template.json` as a companion to the existing quest record. The current schema owner decides the versioned migration/extension; content workers do not replace the shared schema unilaterally.

Preserve stable quest/actor IDs. If splitting/replacing a record really requires an ID change, include aliases/migration and owner review for any affected existing save. Re-run required graph/cycle/reachability checks, optional dependencies, safe inventory/claims, duplicate-reward protection and applicable both-combat-mode tests. Reopen spatial/collision gates only where placements changed; coordinate map owners.

Narrative acceptance requires a coherent local story, visible contribution to the global storyline, frequent sourced book callbacks, credible NPC knowledge, no unsupported source claims, original authored prose, working mechanics and a reversible change record. Author/testing success is not final owner canon or shipping acceptance.

## 9. Rights and presentation — separate from creative intent

Describe the current project as an **unofficial fan continuation** unless actual authorization is documented. Do not claim an official sequel, endorsement, licensed adaptation or approval from the source creators/publisher. Keep new project canon and source-book canon visibly separate in authoring records.

This policy is not a legal clearance. Private/noncommercial or POC status is not an automatic permission or fair-use determination. Preserve credits/source provenance and route public distribution, monetization, branding and substantial source-character/story use through the existing rights/release decision process. A rights concern is not permission for an agent to silently rewrite the owner's project as unrelated fantasy; surface the decision instead.

U.S. Copyright Office background checked 2026-09-05:
- https://copyright.gov/what-is-copyright/ — copyright includes the derivative-work right.
- https://www.copyright.gov/fair-use/more-info.html — noncommercial use does not automatically establish fair use.

No public release, licensing claim, provider spend, merge or deployment is authorized by this narrative delegation.

## 10. Shared session requirement

Every host loads this policy via shared `START_HERE.md` / `CURRENT_DIRECTION.md` and the complete `PROJECT_CONTEXT_READSET.md`. A Claude-only handoff is never the sole source of lore or autonomy. Existing workers preserve work, read the delta, record any contradictions and continue the authorized scope; do not reset, repeat installation or discard useful work.

The instructions and template are enforceable requirements for agents/review, not evidence that a runtime validator has been implemented or that existing quests have already been rewritten.
