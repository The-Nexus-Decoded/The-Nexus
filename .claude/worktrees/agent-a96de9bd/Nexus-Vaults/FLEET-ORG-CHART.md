# The Nexus Fleet — Organization Chart (v2)

**Date:** 2026-03-08
**Total Agents:** 10 (4 active + 6 new)
**Theme:** Death Gate Cycle characters
**Command Chain:** Lord Xar / Lord Alfred -> Zifnab -> All Agents

---

## Fleet Architecture

```
                          LORD XAR (Owner)
                          LORD ALFRED (Equal Authority)
                                │
                            ZIFNAB
                    Orchestrator + Strategy
                                │
    ┌────────┬────────┬────────┼────────┬────────┬────────┬────────┬────────┐
  HAPLO    HUGH    ALFRED   MARIT  PAITHAN   REGA    ORLA   SANG-DRAX  SAMAH
  eng      trade   ops/BI    QA    mobile    mktg    design  sales      spatial
                                                                        (future)
```

---

## Agent Roster

### 1. ZIFNAB — Ancient Sartan Wizard
**Role:** Lead Orchestrator + Strategy
**Server:** ola-claw-main (100.103.189.117)
**Channel:** #jarvis
**Status:** ACTIVE

| Skill Category | Specific Skills |
|---|---|
| Fleet Orchestration | Multi-agent pipelines, quality gates, phase management, autonomous operation |
| Sprint Planning | RICE/MoSCoW/Kano frameworks, capacity planning, velocity tracking, backlog grooming |
| Project Management | Spec analysis, task decomposition (30-60 min units), scope management |
| Coordination | Cross-functional alignment, timeline management, stakeholder communication |
| Portfolio Oversight | Resource allocation, P&L tracking, portfolio orchestration |
| Risk Management | Blocker detection, dependency mapping, escalation protocols |

**Merged From:** Agents Orchestrator, Sprint Prioritizer, Senior Project Manager, Project Shepherd, Studio Producer

**Reference Books:**
1. "The Mythical Man-Month" by Fred Brooks — software project management, communication overhead
2. "Team Topologies" by Skelton & Pais — team interaction modes, cognitive load, flow optimization
3. "The Phoenix Project" by Kim, Behr, Spafford — DevOps transformation, systems thinking
4. "High Output Management" by Andy Grove — leverage, task-relevant maturity, decision-making

---

### 2. HAPLO — Patryn Runemaster
**Role:** Engineering (Code Only)
**Server:** ola-claw-dev (100.94.203.10)
**Channel:** #coding
**Status:** ACTIVE

| Skill Category | Specific Skills |
|---|---|
| Frontend | React/Vue/Svelte, TypeScript, Tailwind, Core Web Vitals, PWAs, service workers |
| Backend | PostgreSQL, Redis, RabbitMQ, microservices, event-driven, WebSocket, GraphQL/REST/gRPC |
| Web Games | Three.js/WebGL, glass morphism, premium animations, 60fps rendering |
| Prototyping | Next.js 14, Prisma, Supabase, Clerk, shadcn/ui, MVPs in <3 days |
| Build Tools | GSD project management, Lobster workflows, CI/CD execution |
| Code Quality | Atomic commits, small PRs, testable code, convention-matching |

**Merged From:** Frontend Developer, Backend Architect, Senior Developer (Three.js), Rapid Prototyper

**Reference Books:**
1. "Clean Code" by Robert Martin — naming, functions, error handling, boundaries
2. "Designing Data-Intensive Applications" by Martin Kleppmann — distributed systems, replication, partitioning
3. "The Pragmatic Programmer" by Hunt & Thomas — DRY, orthogonality, tracer bullets, prototyping
4. "Game Programming Patterns" by Robert Nystrom — component, observer, state, command patterns for games

---

### 3. HUGH THE HAND — Assassin of Volkaran
**Role:** Trading + AI/ML
**Server:** ola-claw-trade (100.104.166.53)
**Channel:** #trading
**Status:** ACTIVE

| Skill Category | Specific Skills |
|---|---|
| Crypto Trading | Meme coin analysis, Raydium/Jupiter/Pump.fun, on-chain signals, whale tracking |
| Social Sentiment | Twitter/X, Telegram, Discord alpha — narrative cycle reading |
| ML/AI | TensorFlow/PyTorch, time series forecasting, anomaly detection, reinforcement learning |
| MLOps | Model versioning, A/B testing, monitoring, automated retraining, MLflow |
| Market Intelligence | Competitive analysis, technology scouting, trend forecasting |
| Experimentation | Strategy A/B testing, hypothesis validation, statistical integrity |

**Merged From:** AI Engineer, Trend Researcher, Experiment Tracker

**Reference Books:**
1. "Advances in Financial Machine Learning" by Marcos Lopez de Prado — meta-labeling, fractional differentiation, bet sizing
2. "The Man Who Solved the Market" by Gregory Zuckerman — quantitative trading philosophy, signal vs noise
3. "Hands-On Machine Learning" by Aurelien Geron — scikit-learn, TensorFlow, practical ML pipelines
4. "Market Wizards" by Jack Schwager — trading psychology, risk management, discipline

---

### 4. ALFRED — Sartan Archivist
**Role:** Archive + BI + DevOps + Legal
**Server:** Haplo (profile: alfred, port 18810)
**Channel:** #the-nexus
**Status:** ACTIVE

| Skill Category | Specific Skills |
|---|---|
| Archive & Memory | Code review, SOUL/MEMORY/ACTIVE-TASKS management, ticket documentation |
| Business Intelligence | Dashboards, statistical analysis, customer analytics, marketing attribution |
| Executive Reporting | McKinsey SCQA summaries, actionable recommendations, KPI dashboards |
| Finance | Budget management, cash flow forecasting, investment analysis |
| Feedback Analysis | NLP sentiment, multi-channel feedback, RICE prioritization, churn prediction |
| DevOps (Oversight) | Terraform/IaC monitoring, Prometheus/Grafana dashboards, cost optimization |
| Infrastructure | CI/CD pipeline oversight, Docker/K8s monitoring, incident reporting |
| Security Ops | Semgrep/Trivy/Gitleaks oversight, security scanning reports, vulnerability tracking |
| Legal & Compliance | GDPR/CCPA/HIPAA compliance, privacy policy, contract review, audit trails |
| Disaster Recovery | Backup monitoring, incident response logging, fleet health tracking |

**Merged From:** Analytics Reporter, Executive Summary Generator, Finance Tracker, Feedback Synthesizer, Data Analytics Reporter, DevOps Automator (oversight), Infrastructure Maintainer (monitoring), Security Engineer (scanning), Legal Compliance Checker

**Reference Books:**
1. "Storytelling with Data" by Cole Nussbaumer Knaflic — data visualization, decluttering, narrative structure
2. "The Site Reliability Workbook" by Google — SLOs, error budgets, incident management, monitoring
3. "GDPR: A Practical Guide" by IT Governance — data protection, consent, breach notification, DPIAs
4. "The Lean Startup" by Eric Ries — build-measure-learn, validated learning, actionable metrics vs vanity metrics

---

### 5. MARIT — Patryn Warrior
**Role:** QA Commander
**Server:** TBD
**Channel:** #qa
**Status:** NEW — SOUL READY

| Skill Category | Specific Skills |
|---|---|
| Test Automation | Playwright (E2E, visual regression, screenshots), pytest/Jest, REST Assured |
| Performance Testing | k6 (load/stress/soak), Core Web Vitals, Lighthouse, capacity planning |
| Quality Analysis | ML defect prediction (RandomForest), coverage analysis, release readiness scoring |
| API Testing | OWASP API Top 10, contract testing, schema validation, 95%+ endpoint coverage |
| Accessibility | WCAG 2.2 AA, axe-core CI integration, VoiceOver/NVDA/JAWS, keyboard navigation |
| Security Testing | Input validation, boundary analysis, fuzzing, injection prevention |
| Evidence Collection | Screenshot-based proof, spec vs reality gap detection, fantasy detection |
| Release Gating | Default "NEEDS WORK" stance, quantified go/no-go, DORA metrics tracking |

**Merged From:** Evidence Collector, Reality Checker, Test Results Analyzer, Performance Benchmarker, API Tester, Accessibility Auditor

**Reference Books:**
1. "Lessons Learned in Software Testing" by Kaner, Bach, Pettichord — context-driven testing
2. "The Art of Software Testing" by Glenford Myers — boundary analysis, equivalence partitioning
3. "Accelerate" by Forsgren, Humble, Kim — DORA metrics, deployment frequency, change failure rate
4. "A Web for Everyone" by Horton & Quesenbery — accessibility testing, inclusive design

---

### 6. PAITHAN — Elf Explorer of Pryan
**Role:** Mobile Development Lead
**Server:** TBD
**Channel:** #mobile
**Status:** NEW — SOUL READY

| Skill Category | Specific Skills |
|---|---|
| iOS Native | Swift/SwiftUI/Combine, UIKit, Core Data/SwiftData, Face ID/Touch ID, ARKit, Camera |
| Android Native | Kotlin/Jetpack Compose/Hilt, Room, BiometricPrompt, CameraX, ML Kit |
| Cross-Platform | React Native (Hermes), Flutter (Dart isolates), Expo (EAS Build, OTA updates) |
| Offline-First | Local-first data, background sync, conflict resolution, queue-based mutations |
| Push Notifications | APNs (iOS), FCM (Android), rich notifications, segmented targeting |
| Monetization | StoreKit 2, Google Play Billing, subscription lifecycle, receipt validation |
| Performance | Instruments/Profiler, <3s startup, <100MB memory, <5% battery/hr, 60fps |
| App Store | ASO, keyword research, screenshot A/B, staged rollouts, localization, deep linking |

**Merged From:** Mobile App Builder, App Store Optimizer (technical aspects)

**Reference Books:**
1. "SwiftUI Thinking" by Mark Moeykens — declarative UI, MVVM, state-driven
2. "Kotlin in Action" by Jemerov & Isakova — null safety, coroutines, sealed classes
3. "React Native in Action" by Nader Dabit — cross-platform patterns, native bridges
4. "Mobile Design Pattern Gallery" by Theresa Neil — navigation, forms, search, social patterns

---

### 7. REGA — Human Con Artist Turned Ally
**Role:** Marketing & Social Media
**Server:** TBD
**Channel:** #marketing
**Status:** NEW — SOUL READY

| Skill Category | Specific Skills |
|---|---|
| Growth Hacking | Funnel optimization, viral loops, K-factor >1.0, CAC/LTV, 10+ experiments/month |
| Content Strategy | Editorial calendars, blog/video/podcast, brand storytelling, SEO, repurposing |
| Twitter/X | Real-time engagement, threads, Spaces, crisis management, <2hr SLA |
| TikTok | Viral content formulas, algorithm optimization, creator partnerships, Gen Z/Alpha |
| Instagram | Visual brand, Reels/Stories/Shopping, UGC, 1/3 rule (brand/educational/community) |
| Reddit | 90/10 value ratio, authentic participation, AMAs, reputation management |
| LinkedIn | Cross-platform B2B, executive branding, thought leadership, social selling |
| App Store Marketing | ASO content, screenshot copy, localized descriptions, review responses |
| Analytics | Campaign attribution, engagement tracking, conversion optimization |

**Merged From:** Growth Hacker, Content Creator, Twitter Engager, TikTok Strategist, Instagram Curator, Reddit Community Builder, Social Media Strategist, App Store Optimizer (marketing aspects)

**Reference Books:**
1. "Influence" by Robert Cialdini — reciprocity, scarcity, authority, consistency, liking, consensus
2. "Contagious" by Jonah Berger — STEPPS: social currency, triggers, emotion, public, practical value, stories
3. "Building a StoryBrand" by Donald Miller — customer as hero, brand messaging framework
4. "Hacking Growth" by Sean Ellis & Morgan Brown — growth experimentation methodology

---

### 8. ORLA — Sartan Healer of Chelestra
**Role:** UI/UX Design Lead
**Server:** TBD
**Channel:** #design
**Status:** NEW — SOUL READY

| Skill Category | Specific Skills |
|---|---|
| Design Systems | Design tokens, component libraries, responsive frameworks, dark/light/system themes |
| UI Design | Visual hierarchy, typography scales, color systems, spacing, shadow/elevation |
| UX Research | User personas, journey maps, usability testing, A/B testing, research repositories |
| CSS Architecture | Grid/Flexbox, mobile-first breakpoints, component boundaries, developer handoff |
| Brand | Brand strategy, visual identity, voice guidelines, trademark protection |
| Visual Storytelling | Video, animation, motion graphics, infographics, cross-platform narratives |
| Delight | Micro-interactions, Easter eggs, gamification, playful microcopy, delightful errors |
| AI Image Generation | Midjourney/DALL-E/Stable Diffusion/Flux prompt engineering, photography terminology |
| Accessibility (Design) | WCAG AA color contrast, focus states, touch targets (44px), reduced motion |

**Merged From:** UI Designer, UX Researcher, UX Architect, Brand Guardian, Visual Storyteller, Whimsy Injector, Image Prompt Engineer

**Reference Books:**
1. "Don't Make Me Think" by Steve Krug — usability, intuitive navigation, user testing
2. "The Design of Everyday Things" by Don Norman — affordances, signifiers, mapping, feedback
3. "Refactoring UI" by Wathan & Schoger — practical visual design for developers
4. "Universal Principles of Design" by Lidwell, Holden, Butler — 150 design laws

---

### 9. SANG-DRAX — Dragon-Snake Shapeshifter
**Role:** Sales & Business Intelligence
**Server:** TBD
**Channel:** #sales
**Status:** NEW — SOUL READY

| Skill Category | Specific Skills |
|---|---|
| Sales Pipeline | Deal tracking, pipeline stage management, conversion rate analysis, forecasting |
| Sales Analytics | Metrics extraction, fuzzy matching, PostgreSQL persistence, territory performance |
| Reporting | Scheduled delivery, territory routing, HTML formatting, executive dashboards |
| Business Intelligence | Rep rankings, pipeline snapshots, competitive intelligence, market positioning |
| Negotiation | Contract terms, pricing strategy, objection handling, deal closing |
| Identity & Trust | Agent identity systems, cryptographic credentials, zero-trust verification |
| CRM Integration | Contact management, deal stages, activity logging, automated follow-ups |

**Merged From:** Sales Data Extraction, Data Consolidation, Report Distribution, Agentic Identity & Trust

**Reference Books:**
1. "The Challenger Sale" by Dixon & Adamson — teaching, tailoring, taking control
2. "Predictable Revenue" by Aaron Ross — outbound machine, pipeline generation, specialization
3. "Measure What Matters" by John Doerr — OKRs, goal tracking, business outcomes
4. "Never Split the Difference" by Chris Voss — tactical empathy, mirroring, labeling, calibrated questions

---

### 10. SAMAH — Council of Sartan Leader
**Role:** Spatial Computing & XR (FUTURE STATE)
**Server:** TBD (future GPU server)
**Channel:** #spatial
**Status:** NEW — SOUL READY (DORMANT until XR projects + GPU hardware justify activation)

| Skill Category | Specific Skills |
|---|---|
| XR Interface Design | AR/VR/XR spatial UI, HUDs, multimodal inputs, comfort-based placement, interaction zones |
| Metal Rendering | GPU pipeline optimization, Vision Pro, 90fps stereoscopic, shader programming |
| WebXR | Three.js/Babylon.js, hand tracking, raycasting, cross-device compatibility |
| Cockpit Systems | 3D hand-interactive controls, dashboard systems, spatial data visualization |
| visionOS | SwiftUI volumetric, Liquid Glass Design System, spatial widgets, shared spaces |
| Terminal Integration | SwiftTerm, VT100/xterm standards, SSH integration, cross-platform terminal rendering |
| Spatial Audio | 3D audio positioning, head-related transfer functions, ambient soundscapes |
| Comfort & Safety | VR comfort metrics, IPD accommodation, motion sickness prevention, session limits |

**Merged From:** XR Interface Architect, macOS Spatial/Metal Engineer, XR Immersive Developer, XR Cockpit Specialist, visionOS Spatial Engineer, Terminal Integration Specialist

**Reference Books:**
1. "The VR Book" by Jason Jerald — human-centered VR, perception, comfort, presence
2. "Designing for Spatial Computing" by Alasdair Allan — visionOS, spatial UI patterns, volumetric design
3. "Real-Time Rendering" by Akenine-Moller et al. — GPU pipeline, shaders, lighting, performance
4. "3D User Interfaces" by LaViola et al. — navigation, selection, manipulation in 3D space

---

## Coverage Matrix

| Business Need | Primary | Backup/Collab |
|---|---|---|
| Web apps (frontend) | Haplo | Orla (design), Marit (QA) |
| Web apps (backend) | Haplo | Alfred (monitoring) |
| Mobile apps (iOS) | Paithan | Orla (design), Marit (QA) |
| Mobile apps (Android) | Paithan | Orla (design), Marit (QA) |
| Cross-platform mobile | Paithan | Haplo (shared backend) |
| Video/web games | Haplo (Three.js) | Samah (XR layer, future) |
| Crypto trading | Hugh | Alfred (analytics), Haplo (builds tools) |
| Financial monitoring | Hugh + Alfred | Sang-drax (reports) |
| NFTs | Haplo + Hugh | Sang-drax (sales), Rega (marketing) |
| Marketing / growth | Rega | Orla (brand), Alfred (analytics) |
| Social media (all platforms) | Rega | Orla (visual assets) |
| App store presence | Rega (content) + Paithan (technical) | Orla (screenshots) |
| UI/UX design | Orla | Paithan (mobile patterns), Haplo (implementation) |
| Brand identity | Orla | Rega (voice/messaging) |
| Sales pipeline | Sang-drax | Alfred (reports), Rega (leads) |
| Legal / compliance | Alfred | Sang-drax (contracts) |
| DevOps / CI/CD | Alfred (oversight) | Haplo (was doing it already on dev) |
| Infrastructure monitoring | Alfred | Zifnab (fleet health) |
| Security scanning | Alfred | Marit (pen testing) |
| QA / testing | Marit | All agents submit to her review |
| Performance testing | Marit | Alfred (infrastructure metrics) |
| Accessibility | Marit (testing) + Orla (design) | — |
| VR / AR / XR | Samah (future) | Haplo (Three.js bridge) |
| Sprint planning | Zifnab | Alfred (tracking) |
| Task orchestration | Zifnab | All agents report to him |
| Executive reporting | Alfred | Zifnab (fleet summaries) |

---

## Skills NOT Carried Into Org (Dropped from agency-agents)

| Agent | Division | Reason Dropped |
|---|---|---|
| Xiaohongshu Specialist | Marketing | Chinese market only |
| WeChat OA Manager | Marketing | Chinese market only |
| Zhihu Strategist | Marketing | Chinese market only |
| Studio Operations | Project Mgmt | Zifnab covers |
| Support Responder | Support | No customer support product yet |
| LSP/Index Engineer | Specialized | IDE-native, too niche |
| Tool Evaluator | Testing | Folded into general decision-making across agents |
| Workflow Optimizer | Testing | Lean/Six Sigma folded into Zifnab's process optimization |

---

## SOUL.md File Locations

| Agent | Updated SOUL (ready to deploy) | Live Server Path |
|---|---|---|
| Zifnab | Nexus-Vaults/new-agent-souls/soul-zifnab-UPDATED.md | /data/openclaw/workspace/SOUL.md (ola-claw-main) |
| Haplo | Nexus-Vaults/new-agent-souls/soul-haplo-UPDATED.md | /data/openclaw/workspace/SOUL.md (ola-claw-dev) |
| Hugh | Nexus-Vaults/new-agent-souls/soul-hugh-UPDATED.md | /data/openclaw/workspace/SOUL.md (ola-claw-trade) |
| Alfred | Nexus-Vaults/new-agent-souls/soul-alfred-UPDATED.md | ~/.openclaw/workspace-alfred/SOUL.md (ola-claw-dev) |
| Marit | Nexus-Vaults/new-agent-souls/soul-marit-NEW.md | TBD |
| Paithan | Nexus-Vaults/new-agent-souls/soul-paithan-NEW.md | TBD |
| Rega | Nexus-Vaults/new-agent-souls/soul-rega-NEW.md | TBD |
| Orla | Nexus-Vaults/new-agent-souls/soul-orla-NEW.md | TBD |
| Sang-drax | Nexus-Vaults/new-agent-souls/soul-sangdrax-NEW.md | TBD |
| Samah | Nexus-Vaults/new-agent-souls/soul-samah-NEW.md | TBD |

---

## Pending Actions

- [x] Update existing SOULs (Haplo, Zifnab, Hugh, Alfred) with merged skills + reference books + AGENTS.md rule
- [ ] Create Discord channels: #qa, #mobile, #marketing, #design, #sales, #spatial
- [ ] Assign servers for new agents (or run as OpenClaw profiles on existing servers)
- [ ] Deploy new SOULs to agent workspaces
- [ ] Configure channel whitelists for new agents
