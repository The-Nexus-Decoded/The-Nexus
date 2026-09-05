# Nexus Private-to-Community Edition Roadmap

## Owner direction

The complete `The-Nexus` monorepo and SoulDrifter production system remain private.

After the First Breach and first playable Heartvale MVP section are complete and independently verified, the project pivots into a focused Community Edition sprint. The public edition is a useful but deliberately bounded subset generated from approved private commits. It is not a public mirror of the production monorepo and is not maintained as a second full game.

## Canonical roadmap issue

GitHub issue `#474` is the execution board for this roadmap.

## Phase 1 — Immediate private consolidation

Target: today or the next available repository-admin session.

- `#463` — make the repository private and preserve public-state evidence;
- `#476` — back up the repository and protect active worktrees/branches/integrations;
- `#464` — scan full history, rotate credentials and review access;
- `#465` — inventory ownership, provenance and private/public boundaries;
- `#466` — track public candidates lightly during normal MVP handoffs.

### Noninterference rule

During active First Breach/Heartvale work, no Community Edition extraction, second implementation, feature weakening, broad public license, or public repository launch is allowed.

Only privacy, security, ownership, backup and lightweight candidate classification proceed.

## Phase 2 — Community Edition v0.1 after MVP

Trigger: First Breach plus first playable Heartvale independently verified.

Suggested timing:

```text
Week 0–1  scope and public/private feature boundary
Week 1–3  allowlist-driven export/sanitization pipeline
Week 2–4  public repository, licensing, attribution, docs and v0.1 release
```

Issues:

- `#467` — approve Nexus Community Edition v0.1 scope;
- `#468` — build sanitized deterministic export/release pipeline;
- `#469` — launch the public Community Edition repository.

## Product boundaries

### Public Community Edition candidates

- generic SDK/CLI;
- selected public-safe agents and production playbooks;
- generic topology, traversal, collision, staging, environment and evidence tools;
- provider-neutral interfaces;
- one clean Three.js sample project;
- cleared sample assets and public documentation.

### Private Nexus core

- production orchestration and premium agents;
- private provider automation and evaluation data;
- hosted control plane, team workflows and operational intelligence;
- advanced generation/repair systems selected as the moat;
- deployment, security, billing and enterprise capabilities.

### Private SoulDrifter production

- full source and assets;
- complete class/race/character matrix;
- unreleased levels, quests, lore, progression and balancing;
- production backends, admin tooling and roadmap;
- private agent/provider data and internal evidence.

## Bounded public design

Use understandable product limits rather than random breakage.

Possible boundaries include:

- one generic sample zone;
- one or two sample controllers/classes;
- limited sample assets and templates;
- local single-project workflows;
- basic validators without premium automated repair/optimization;
- no private provider orchestration or production datasets.

## Phase 3 — SoulDrifter showcase/starter edition

Target: approximately 3–6 weeks after MVP, coordinated with Community Edition.

- `#470` — publish a hosted showcase, technical showcase and/or bounded starter edition.

The hosted production source remains private. Any source release is generated through the approved export pipeline.

## Phase 4 — Hosted service discovery

Trigger: measurable Community Edition adoption and support demand.

Target: approximately 6–12 weeks after public release, only when traction exists.

- `#471` — design the smallest proprietary Nexus Cloud managed-service MVP.

Possible first wedge:

```text
connect repository
-> select validated workflow
-> run managed agents/build/device checks
-> receive evidence and artifacts
```

## Phase 5 — Support, enterprise, premium modules and marketplace

Trigger: recurring demand and a proven support/hosted wedge.

- `#472` — define official support, enterprise, premium module, marketplace and commercial-license roadmap.

Do not start every business model simultaneously. Choose the smallest path supported by actual demand.

## Phase 6 — Post-launch governance

- `#475` — review adoption, attribution, maintenance cost and private-moat boundaries monthly.

Public releases are deliberate tagged exports. Private commits do not automatically flow to the public repository.

## Optional token research

- `#473` — legal/security-gated research only.

No token launch, sale, liquidity, fundraising or public promotion is authorized by the roadmap.

## Attribution and support direction

The public edition must make the official source clear:

- Ola Lawal;
- The Nexus Decoded;
- canonical repository and project links;
- `NOTICE`, `AUTHORS.md`, `CITATION.cff`, `TRADEMARKS.md`, contribution and security policies;
- community self-service support with no guaranteed SLA;
- clear contact path for official integration, customization, priority support and future hosted services.

## Release architecture

```text
private canonical monorepo
-> owner-approved allowlist/export manifest
-> sanitization and dependency replacement
-> secret/license/provenance/build/test gates
-> human diff review
-> public release commit and tag
```

The public repository never becomes the source of truth for private production work.

## Success criteria

- private game/platform remains protected and maintainable;
- Community Edition is useful enough to earn adoption and reputation;
- attribution clearly points to Ola Lawal / The Nexus Decoded;
- users have an official route back for support and advanced capabilities;
- Community Edition maintenance does not materially delay SoulDrifter;
- hosted or premium investment is driven by measured demand.