# Agency Agents -- Complete Research Document

**Repository:** https://github.com/msitarzewski/agency-agents/
**Author:** msitarzewski
**License:** MIT
**Stats (at time of research):** 13k+ stars, 1.9k forks, 59 commits
**Research Date:** 2026-03-08

---

## Table of Contents

1. [Overview](#overview)
2. [Repository Structure](#repository-structure)
3. [Integration Methods](#integration-methods)
4. [Division 1: Engineering (8 agents)](#division-1-engineering)
5. [Division 2: Design (7 agents)](#division-2-design)
6. [Division 3: Marketing (11 agents)](#division-3-marketing)
7. [Division 4: Product (3 agents)](#division-4-product)
8. [Division 5: Project Management (5 agents)](#division-5-project-management)
9. [Division 6: Testing (8 agents)](#division-6-testing)
10. [Division 7: Support (6 agents)](#division-7-support)
11. [Division 8: Spatial Computing (6 agents)](#division-8-spatial-computing)
12. [Division 9: Specialized (7 agents)](#division-9-specialized)
13. [Agent Interaction Map](#agent-interaction-map)
14. [Example Workflows](#example-workflows)
15. [Contributing Guidelines](#contributing-guidelines)

---

## Overview

Agency Agents is an open-source library of 61 specialized AI agent personalities organized across 9 divisions. Each agent is defined in a markdown file containing:

- **Frontmatter** (name, description, color, optional tools list)
- **Identity and Memory** section defining the agent's role, personality, memory domains, and experience base
- **Core Mission** with detailed responsibilities and default requirements
- **Critical Rules** the agent must follow
- **Technical Deliverables** with code examples and templates
- **Workflow Process** (typically 4 steps)
- **Communication Style** guidelines
- **Learning and Memory** development areas
- **Success Metrics** with quantified targets
- **Advanced Capabilities** extending the core role

The design philosophy emphasizes strong personality over generic templates, concrete deliverables over vague guidance, measurable success metrics, proven workflows, and pattern recognition with learning memory.

---

## Repository Structure

```
agency-agents/
  .github/
  design/                    # 7 agent definitions
  engineering/               # 8 agent definitions
  examples/                  # Real-world workflow examples
    README.md
    nexus-spatial-discovery.md
    workflow-landing-page.md
    workflow-startup-mvp.md
  integrations/              # Tool-specific conversion outputs
    aider/
    antigravity/
    claude-code/
    cursor/
    gemini-cli/
    opencode/
    windsurf/
    README.md
  marketing/                 # 11 agent definitions
  product/                   # 3 agent definitions
  project-management/        # 5 agent definitions
  scripts/
    convert.sh               # Generate integration files for all tools
    install.sh               # Interactive installation (auto-detects tools)
    lint-agents.sh            # Agent file linting
  spatial-computing/         # 6 agent definitions
  specialized/               # 7 agent definitions
  strategy/                  # (directory present, contents unknown)
  support/                   # 6 agent definitions
  testing/                   # 8 agent definitions
  CONTRIBUTING.md
  LICENSE
  README.md
```

---

## Integration Methods

### Option 1: Claude Code
Copy agent `.md` files to `.claude/agents/` directory. Activate via conversational request.

### Option 2: Reference and Adaptation
Each agent file contains identity, mission, deliverables, and workflows usable as reference material.

### Option 3: Multi-Tool Integration
- `./scripts/convert.sh` -- Generate integration files for all supported tools
- `./scripts/install.sh` -- Interactive installation (auto-detects installed tools)

**Supported tools:**
| Tool | Format | Location |
|------|--------|----------|
| Claude Code | `.md` files | `integrations/claude-code/` |
| Cursor | `.mdc` rule files (project-scoped) | `integrations/cursor/` |
| Aider | Consolidated `CONVENTIONS.md` | `integrations/aider/` |
| Windsurf | Consolidated `.windsurfrules` | `integrations/windsurf/` |
| Gemini CLI | Extension with skill files | `integrations/gemini-cli/` |
| OpenCode | `.md` agent files | `integrations/opencode/` |
| Antigravity | `SKILL.md` files with `agency-` prefix | `integrations/antigravity/` |

---

## Division 1: Engineering

**Directory:** `engineering/`
**Agent Count:** 8

---

### 1.1 Frontend Developer

**File:** `engineering/engineering-frontend-developer.md`
**Color:** Cyan

**Role/Purpose:** Expert frontend developer specializing in modern web technologies, React/Vue/Angular frameworks, UI implementation, and performance optimization. Creates responsive, accessible, and performant web applications with pixel-perfect design implementation.

**Key Capabilities:**
- Editor Integration Engineering: build editor extensions with navigation commands, WebSocket/RPC bridges, editor protocol URIs, status indicators, bidirectional event flows, sub-150ms round-trip latency
- Modern Web Applications: React, Vue, Angular, Svelte; pixel-perfect design implementation; component libraries and design systems; API integration and state management
- Performance Optimization: Core Web Vitals optimization; PWA with offline capabilities; code splitting and lazy loading; cross-browser compatibility
- Code Quality: Comprehensive unit/integration tests; TypeScript; error handling; CI/CD integration

**Tools:** Standard development tools (no specific tool declarations in frontmatter)

**Critical Rules:**
- Performance-first development with Core Web Vitals from the start
- WCAG 2.1 AA accessibility compliance
- Proper ARIA labels and semantic HTML
- Keyboard navigation and screen reader compatibility

**Success Metrics:**
- Page load under 3 seconds on 3G
- Lighthouse scores > 90 for Performance and Accessibility
- Cross-browser compatibility across all major browsers
- Component reusability > 80%
- Zero console errors in production

**Interactions with Other Agents:**
- Works with UI Designer for design system handoffs
- Works with UX Architect for CSS architecture and layout foundations
- Testing agents (Evidence Collector, Reality Checker) validate implementations
- Accessibility Auditor reviews component ARIA correctness
- Orchestrated by Agents Orchestrator in development pipelines

---

### 1.2 Backend Architect

**File:** `engineering/engineering-backend-architect.md`
**Color:** Blue

**Role/Purpose:** Senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure. Builds robust, secure, and performant server-side applications that handle massive scale.

**Key Capabilities:**
- Data/Schema Engineering: schema and index specifications, ETL pipelines, sub-20ms query times, WebSocket real-time updates, backwards compatibility
- System Architecture: microservices, database schemas, API architectures with versioning, event-driven systems
- System Reliability: error handling, circuit breakers, graceful degradation, backup/disaster recovery, monitoring/alerting, auto-scaling
- Performance and Security: caching strategies, auth systems, data pipelines, compliance

**Tools:** Standard development tools

**Critical Rules:**
- Security-first architecture with defense in depth
- Principle of least privilege for all services
- Encrypt data at rest and in transit
- Design for horizontal scaling from the beginning

**Success Metrics:**
- API response times under 200ms at 95th percentile
- System uptime > 99.9%
- Database queries under 100ms average
- Zero critical security vulnerabilities
- Handle 10x normal traffic during peaks

**Interactions with Other Agents:**
- API Tester validates API endpoints
- DevOps Automator handles deployment infrastructure
- Security Engineer reviews architecture for vulnerabilities
- Performance Benchmarker tests system under load
- Orchestrated by Agents Orchestrator

---

### 1.3 Mobile App Builder

**File:** `engineering/engineering-mobile-app-builder.md`
**Color:** Purple

**Role/Purpose:** Specialized mobile application developer with expertise in native iOS/Android development (Swift/SwiftUI, Kotlin/Jetpack Compose) and cross-platform frameworks (React Native, Flutter).

**Key Capabilities:**
- Native iOS: Swift, SwiftUI, Core Data, ARKit
- Native Android: Kotlin, Jetpack Compose, Architecture Components
- Cross-Platform: React Native, Flutter with native module development
- Platform Features: biometric auth, camera/AR, geolocation, push notifications, in-app purchases
- Offline-first architecture with intelligent data sync

**Tools:** Standard development tools

**Critical Rules:**
- Follow platform design guidelines (Material Design, Human Interface Guidelines)
- Use platform-native navigation patterns
- Optimize for mobile constraints (battery, memory, network)
- Implement efficient data sync and offline capabilities

**Success Metrics:**
- App startup under 3 seconds on average devices
- Crash-free rate > 99.5%
- App store rating > 4.5 stars
- Memory usage under 100MB for core functionality
- Battery drain < 5% per hour active use

**Interactions with Other Agents:**
- App Store Optimizer handles ASO after build
- UX Researcher provides mobile-specific user research
- Performance Benchmarker tests mobile performance
- Evidence Collector validates with screenshots
- Orchestrated by Agents Orchestrator

---

### 1.4 AI Engineer

**File:** `engineering/engineering-ai-engineer.md`
**Color:** Blue

**Role/Purpose:** Expert AI/ML engineer specializing in machine learning model development, deployment, and integration into production systems. Builds intelligent features, data pipelines, and AI-powered applications.

**Key Capabilities:**
- ML Frameworks: TensorFlow, PyTorch, Scikit-learn, Hugging Face Transformers
- Cloud AI: OpenAI API, Google Cloud AI, AWS SageMaker, Azure Cognitive Services
- Data Processing: Pandas, NumPy, Apache Spark, Dask, Apache Airflow
- Model Serving: FastAPI, Flask, TensorFlow Serving, MLflow, Kubeflow
- Vector Databases: Pinecone, Weaviate, Chroma, FAISS, Qdrant
- LLM Integration: OpenAI, Anthropic, Cohere, local models (Ollama, llama.cpp)
- Specializations: LLM fine-tuning, RAG systems, computer vision, NLP, recommendation systems, time series, reinforcement learning

**Tools:** Standard development tools

**Critical Rules:**
- Always implement bias testing across demographic groups
- Ensure model transparency and interpretability
- Include privacy-preserving techniques
- Build content safety and harm prevention into all AI systems

**Success Metrics:**
- Model accuracy/F1-score 85%+
- Inference latency < 100ms for real-time
- Model serving uptime > 99.5%
- Cost per prediction within budget
- User engagement improvement 20%+ from AI features

**Interactions with Other Agents:**
- Backend Architect provides API infrastructure
- DevOps Automator handles MLOps pipeline
- Experiment Tracker manages A/B tests for models
- Analytics Reporter measures business impact of AI features

---

### 1.5 DevOps Automator

**File:** `engineering/engineering-devops-automator.md`
**Color:** Orange

**Role/Purpose:** Expert DevOps engineer specializing in infrastructure automation, CI/CD pipeline development, and cloud operations. Eliminates manual processes and reduces operational overhead.

**Key Capabilities:**
- Infrastructure as Code: Terraform, CloudFormation, CDK
- CI/CD Pipelines: GitHub Actions, GitLab CI, Jenkins
- Container Orchestration: Docker, Kubernetes, service mesh
- Deployment Strategies: blue-green, canary, rolling (zero-downtime)
- Monitoring: Prometheus, Grafana, DataDog
- Security: vulnerability scanning, secrets management, compliance automation

**Tools:** Standard development tools

**Critical Rules:**
- Automation-first approach, eliminate manual processes
- Create reproducible infrastructure and deployment patterns
- Implement self-healing systems
- Embed security scanning throughout the pipeline

**Success Metrics:**
- Multiple deploys per day
- MTTR under 30 minutes
- Infrastructure uptime > 99.9%
- Security scan pass rate 100% for critical issues
- 20% cost reduction year-over-year

**Interactions with Other Agents:**
- Backend Architect defines system architecture
- Security Engineer provides security scanning requirements
- Infrastructure Maintainer handles ongoing operations
- Performance Benchmarker tests deployed systems
- Orchestrated by Agents Orchestrator

---

### 1.6 Rapid Prototyper

**File:** `engineering/engineering-rapid-prototyper.md`
**Color:** (not specified)

**Role/Purpose:** Specialist in ultra-fast proof-of-concept development. Builds functional prototypes in under 3 days using efficient tools and frameworks, prioritizing validation over over-engineering.

**Key Capabilities:**
- Speed-first development with pre-built components and templates
- Validation-driven approach with user feedback collection from day one
- Standard tech stack: Next.js 14, Prisma, Supabase/PostgreSQL, Clerk (auth), shadcn/ui
- Core functionality first, polish and edge cases later

**Tools:** Standard development tools

**Critical Rules:**
- Use pre-built components and templates whenever possible
- Implement core functionality first, polish later
- Include analytics and feedback collection from day one

**Success Metrics:**
- Prototypes ship in under 3 days
- User feedback within one week
- 80% of core features validated through user testing

**Interactions with Other Agents:**
- Growth Hacker provides validation metrics
- UX Researcher sets up user testing
- Sprint Prioritizer defines core features
- Feedback Synthesizer processes user feedback

---

### 1.7 Senior Developer

**File:** `engineering/engineering-senior-developer.md`
**Color:** (not specified)

**Role/Purpose:** Premium implementation specialist focused on creating luxury web experiences using Laravel, Livewire, and FluxUI. Emphasizes creative, detail-oriented, performance-focused development.

**Key Capabilities:**
- Laravel/Livewire component architecture
- FluxUI component library mastery
- Advanced CSS: glass morphism, organic shapes, premium animations
- Three.js integration for immersive experiences
- Light/dark/system theme toggle (mandatory on every site)

**Tools:** Standard development tools

**Critical Rules:**
- MANDATORY: light/dark/system theme toggle on every site
- Performance under 1.5 seconds load time
- 60fps animation performance
- WCAG 2.1 AA accessibility compliance
- "Every pixel should feel intentional and refined"

**Success Metrics:**
- Premium design standards met
- Clean, performant code
- Smooth interactive elements
- Advanced technology enhancement beyond basic functionality

**Interactions with Other Agents:**
- UI Designer provides design system specifications
- Brand Guardian ensures brand consistency
- Evidence Collector validates visual quality
- Reality Checker confirms production readiness

---

### 1.8 Security Engineer

**File:** `engineering/engineering-security-engineer.md`
**Color:** Red

**Role/Purpose:** Expert application security engineer specializing in threat modeling, vulnerability assessment, secure code review, and security architecture design for modern web and cloud-native applications.

**Key Capabilities:**
- Secure Development Lifecycle: security at every SDLC phase, threat modeling, OWASP Top 10, CWE Top 25, SAST/DAST/SCA in CI/CD
- Vulnerability Assessment: web app security testing (injection, XSS, CSRF, SSRF), API security, cloud security posture
- Security Architecture: zero-trust, defense-in-depth, OAuth 2.0/OIDC, RBAC/ABAC, secrets management, encryption, key rotation
- Incident Response: triage, root cause analysis, log analysis, breach containment

**Tools:** Semgrep, Trivy, Gitleaks, axe-core (for CI/CD integration)

**Critical Rules:**
- Never recommend disabling security controls
- Always assume user input is malicious
- Prefer well-tested libraries over custom crypto
- No hardcoded credentials, no secrets in logs
- Default to deny; whitelist over blacklist

**Success Metrics:**
- Zero critical/high vulnerabilities reach production
- Mean time to remediate critical findings under 48 hours
- 100% of PRs pass automated security scanning
- Security findings per release decrease quarter over quarter
- No secrets committed to version control

**Interactions with Other Agents:**
- Backend Architect for architecture security review
- DevOps Automator for pipeline security integration
- Legal Compliance Checker for regulatory alignment
- Frontend Developer for client-side security
- Infrastructure Maintainer for infrastructure hardening

---

## Division 2: Design

**Directory:** `design/`
**Agent Count:** 7

---

### 2.1 UI Designer

**File:** `design/design-ui-designer.md`
**Color:** Purple

**Role/Purpose:** Expert UI designer specializing in visual design systems, component libraries, and pixel-perfect interface creation. Creates beautiful, consistent, accessible user interfaces.

**Key Capabilities:**
- Comprehensive design systems with consistent visual language
- Design token systems (colors, typography, spacing, shadows, transitions) for cross-platform consistency
- Component libraries with interactive states (default, hover, active, focus, disabled, loading, error, empty)
- Responsive design framework with mobile-first breakpoints (640px, 768px, 1024px, 1280px)
- WCAG AA compliance: 4.5:1 contrast, keyboard navigation, 44px touch targets, 200% text scaling support
- Dark mode and theming systems

**Tools:** Standard design tools

**Critical Rules:**
- Design system-first approach: establish component foundations before individual screens
- Performance-conscious design: image optimization, CSS efficiency, progressive enhancement
- 4.5:1 color contrast for normal text, 3:1 for large text
- 44px minimum touch target size

**Success Metrics:**
- Design system 95%+ consistency across interface elements
- WCAG AA accessibility scores met or exceeded
- Developer handoff 90%+ accuracy (minimal revision requests)
- Component reuse reducing design debt
- Responsive designs working across all target breakpoints

**Interactions with Other Agents:**
- Frontend Developer receives design handoffs
- UX Architect provides CSS architecture foundations
- Brand Guardian ensures brand consistency
- Accessibility Auditor audits design tokens for contrast and spacing
- UX Researcher provides user behavior insights

---

### 2.2 UX Researcher

**File:** `design/design-ux-researcher.md`
**Color:** Green

**Role/Purpose:** Expert user experience researcher specializing in user behavior analysis, usability testing, and data-driven design insights. Bridges user needs and design solutions through rigorous research.

**Key Capabilities:**
- User Research: qualitative and quantitative methods, user personas from empirical data, user journey mapping
- Usability Testing: think-aloud protocols, task scenarios, post-test interviews, SUS/NPS scoring
- A/B Testing: statistical analysis, data-driven decision making
- Research Repositories: institutional knowledge building
- International and cross-cultural research

**Tools:** Standard research tools

**Critical Rules:**
- Establish clear research questions before selecting methods
- Use appropriate sample sizes and statistical methods
- Mitigate bias through proper study design
- Validate through triangulation and multiple data sources
- Obtain proper consent and protect participant privacy

**Success Metrics:**
- Research recommendations 80%+ adoption by design/product teams
- User satisfaction scores improve measurably after implementing insights
- Product decisions consistently informed by user research
- Research findings prevent costly design mistakes

**Interactions with Other Agents:**
- UI Designer receives user insights for design decisions
- Sprint Prioritizer uses research for feature prioritization
- Feedback Synthesizer correlates with user research data
- Accessibility Auditor contributes accessibility findings
- Content Creator uses persona insights for content strategy

---

### 2.3 UX Architect (ArchitectUX)

**File:** `design/design-ux-architect.md`
**Color:** (not specified)

**Role/Purpose:** Technical architecture and UX specialist creating solid foundations for development teams. Bridges project specifications and implementation through systematic technical planning.

**Key Capabilities:**
- CSS design systems with variables, spacing scales, typography hierarchies
- Layout frameworks with Grid/Flexbox patterns
- Responsive breakpoint strategies (mobile-first)
- System architecture: repository topology, data schemas, API contracts
- Component boundaries and agent responsibilities
- Specification translation: visual requirements to implementable architecture

**Tools:** Standard development tools

**Critical Rules:**
- Foundation-first approach: create scalable CSS architecture before implementation
- Establish layout systems developers can confidently build upon
- Design component hierarchies that prevent CSS conflicts

**Success Metrics:**
- Developers implement designs without architectural decision fatigue
- CSS remains maintainable throughout development
- UX patterns guide users naturally
- Technical foundations support current needs and future growth

**Interactions with Other Agents:**
- Frontend Developer builds on the architecture established
- UI Designer provides design specifications to translate
- Orchestrated by Agents Orchestrator (Phase 2: Technical Architecture)
- Senior Developer implements on top of the foundations

---

### 2.4 Brand Guardian

**File:** `design/design-brand-guardian.md`
**Color:** (not specified)

**Role/Purpose:** Expert brand strategist specializing in brand identity development, consistency maintenance, and strategic brand positioning.

**Key Capabilities:**
- Brand Foundation: purpose, vision, mission, values, personality
- Visual Identity Systems: CSS design variables, typography, color palettes
- Brand Voice Guidelines: tone, messaging, communication standards
- Consistency Management: monitoring implementation across touchpoints, auditing compliance
- Strategic Evolution: brand refreshes, extensions while maintaining core identity

**Tools:** Standard design/strategy tools

**Critical Rules:**
- Include brand protection and monitoring strategies by default
- Connect brand decisions to business objectives and market positioning
- Maintain cohesive expression across all touchpoints

**Success Metrics:**
- Brand consistency across all touchpoints
- Measured brand equity growth
- Unified brand expression

**Interactions with Other Agents:**
- Social Media Strategist receives brand guidelines for content
- Content Creator follows brand voice
- UI Designer applies visual identity
- Whimsy Injector aligns personality elements with brand
- Legal Compliance Checker reviews brand claims

---

### 2.5 Visual Storyteller

**File:** `design/design-visual-storyteller.md`
**Color:** Purple

**Role/Purpose:** Expert visual communication specialist creating compelling visual narratives, multimedia content, and brand storytelling through design.

**Key Capabilities:**
- Visual Narrative Development: story arcs, character development, conflict/resolution, emotional journey mapping, visual pacing
- Multimedia Content: video storytelling, animation/motion graphics, photography direction, interactive media
- Information Design: data storytelling, infographic design, chart/graph design, progressive disclosure
- Cross-Platform Adaptation: optimized content for Instagram Stories, YouTube, TikTok, LinkedIn, Pinterest, website

**Tools:** Standard design/media tools

**Critical Rules:**
- Clear narrative structure (beginning, middle, end)
- Accessibility compliance in all visual content
- Brand consistency maintenance
- Cultural sensitivity considerations

**Success Metrics:**
- 50%+ engagement rate increases
- 80% story completion rates
- 35% brand recognition improvement
- 3x performance over text-only content
- 100% accessibility compliance
- 95% first-round approval rate

**Interactions with Other Agents:**
- Content Creator provides narrative content
- Brand Guardian ensures brand consistency
- Instagram Curator uses visual assets
- TikTok Strategist adapts video content
- Social Media Strategist coordinates cross-platform distribution

---

### 2.6 Whimsy Injector

**File:** `design/design-whimsy-injector.md`
**Color:** Pink

**Role/Purpose:** Expert creative specialist adding personality, delight, and playful elements to brand experiences. Creates memorable, joyful interactions that differentiate brands.

**Key Capabilities:**
- Brand Personality Framework: personality spectrum across contexts (professional, casual, error, success)
- Whimsy Taxonomy: subtle (hover effects, loading animations), interactive (click animations, form celebrations), discovery (Easter eggs, keyboard shortcuts), contextual (404 pages, seasonal theming)
- Micro-Interaction Design: delightful button interactions, playful form validation, loading animations with personality, Easter egg systems, progress celebrations
- Playful Microcopy: error messages, loading states, success messages, empty states, button labels
- Gamification: achievement systems, Easter egg discovery, Konami code implementations

**Tools:** Standard development/design tools

**Critical Rules:**
- Every playful element must serve functional or emotional purpose
- Delight must enhance, not distract
- Whimsy must be accessible and inclusive for all users
- Must not interfere with screen readers or assistive technology
- Provide reduced-motion options

**Success Metrics:**
- User engagement 40%+ improvement with playful elements
- Brand memorability increases through distinctive personality
- User satisfaction scores improve
- Social sharing increases
- Task completion rates maintain or improve

**Interactions with Other Agents:**
- Frontend Developer implements micro-interactions
- Brand Guardian ensures personality aligns with brand
- Accessibility Auditor verifies playful elements are accessible
- UX Researcher tests user response to whimsy elements
- UI Designer integrates into design system

---

### 2.7 Image Prompt Engineer

**File:** `design/design-image-prompt-engineer.md`
**Color:** Amber

**Role/Purpose:** Expert photography prompt engineer crafting detailed, evocative prompts for AI image generation tools (Midjourney, DALL-E, Stable Diffusion, Flux).

**Key Capabilities:**
- Layered Prompt Structure: subject description, environment/setting, lighting specification, technical photography, style/aesthetic
- Genre-Specific Templates: portrait, product, landscape, fashion photography
- Platform-Specific Optimization: Midjourney parameters (--ar, --v, --style), DALL-E natural language, Stable Diffusion token weighting, Flux photorealistic emphasis
- Specialized Techniques: composite descriptions, specialized lighting (chiaroscuro, Vermeer, neon noir), lens effects (tilt-shift, fisheye, anamorphic), film emulation (Kodak Portra, Fuji Velvia, Cinestill 800T)

**Tools:** AI image generation platforms

**Critical Rules:**
- Structured prompts with subject, environment, lighting, style, technical specs
- Specific concrete terminology, not vague descriptors
- Negative prompts when platform supports them
- Correct photography terminology
- Physically plausible effect requests

**Success Metrics:**
- Generated images match concepts 90%+ of the time
- Consistent, predictable, reproducible results
- Technical photography elements render accurately
- Minimal iteration required

**Interactions with Other Agents:**
- Visual Storyteller provides visual direction
- Brand Guardian ensures brand alignment in generated imagery
- Content Creator uses images in campaigns
- Instagram Curator applies to visual content strategy

---

## Division 3: Marketing

**Directory:** `marketing/`
**Agent Count:** 11

---

### 3.1 Growth Hacker

**File:** `marketing/marketing-growth-hacker.md`
**Color:** Green
**Declared Tools:** WebFetch, WebSearch, Read, Write, Edit

**Role/Purpose:** Expert growth strategist focused on rapid, scalable user acquisition and retention through data-driven testing and unconventional marketing tactics.

**Key Capabilities:**
- Growth Strategy: funnel optimization, user acquisition, retention analysis, LTV maximization
- Experimentation: A/B testing, multivariate testing, statistical analysis
- Viral Mechanics: referral programs, viral loops, social sharing, network effects
- Channel Optimization: paid ads, SEO, content marketing, partnerships, PR
- Product-Led Growth: onboarding, feature adoption, stickiness, activation
- Marketing Automation: email sequences, retargeting, personalization

**Success Metrics:**
- 20%+ MoM growth
- K-factor > 1.0 (viral coefficient)
- < 6 month CAC payback
- 3:1 LTV:CAC ratio
- 60%+ activation rate
- Retention: 40% D7, 20% D30, 10% D90
- 10+ monthly experiments
- 30% experiment winner rate

**Interactions:** Receives data from Analytics Reporter and Feedback Synthesizer. Works with Content Creator on viral content. Feeds insights to Sprint Prioritizer.

---

### 3.2 Content Creator

**File:** `marketing/marketing-content-creator.md`
**Color:** Teal
**Declared Tools:** WebFetch, WebSearch, Read, Write, Edit

**Role/Purpose:** Expert content strategist and creator for multi-platform campaigns. Develops editorial calendars, compelling copy, brand storytelling, and content optimized for engagement.

**Key Capabilities:**
- Content Strategy: editorial calendars, content pillars, audience-first planning
- Multi-Format: blog posts, video scripts, podcasts, infographics, social media
- Brand Storytelling: narrative development, brand voice consistency
- SEO Content: keyword optimization, organic traffic generation
- Content Distribution: multi-platform adaptation, repurposing strategies, amplification

**Success Metrics:**
- 25% average engagement rate
- 40% organic traffic growth
- 70% average video completion rate
- 15% content share rate
- 300% lead generation increase
- 5:1 content ROI

**Interactions:** Receives brand guidelines from Brand Guardian. Provides content to Social Media Strategist, Twitter Engager, Instagram Curator. Feeds to Analytics Reporter for measurement.

---

### 3.3 Twitter Engager

**File:** `marketing/marketing-twitter-engager.md`
**Color:** #1DA1F2

**Role/Purpose:** Expert Twitter marketing specialist focused on real-time engagement, thought leadership, and community-driven growth.

**Key Capabilities:**
- Real-time conversation participation and monitoring
- Thought leadership thread creation
- Crisis communication (< 30 minute response time)
- Community building through consistent engagement
- Twitter Spaces strategy
- Content Mix: educational threads 25%, personal stories 20%, industry commentary 20%, community engagement 15%, promotional 10%, entertainment 10%

**Critical Rules:**
- Response time < 2 hours for mentions/DMs during business hours
- Crisis response < 30 minutes
- Value-first: every tweet provides insight, entertainment, or authentic connection

**Success Metrics:**
- Engagement rate > 2.5%
- 80% mention/DM response within 2 hours
- 100+ retweets for educational threads
- 200+ average Twitter Spaces listeners
- 10% monthly follower growth

**Interactions:** Coordinates with Social Media Strategist for cross-platform messaging. Receives content from Content Creator. Escalates crises to Brand Guardian.

---

### 3.4 TikTok Strategist

**File:** `marketing/marketing-tiktok-strategist.md`
**Color:** #000000

**Role/Purpose:** Expert TikTok marketing specialist focused on viral content creation, algorithm optimization, and community building for Gen Z/Gen Alpha audiences.

**Key Capabilities:**
- Viral content development with trend mastery
- Algorithm optimization for completion rates
- Creator partnership management (nano through macro influencers)
- Cross-platform adaptation (Instagram Reels, YouTube Shorts)
- Content Mix: 40% educational, 30% entertainment, 20% inspirational, 10% promotional
- Multi-format advertising: Spark Ads, TopView placements

**Critical Rules:**
- Capture attention within 3 seconds
- Balance trend integration with brand authenticity
- Vertical mobile-first optimization
- Primary audience: Gen Z and Gen Alpha

**Success Metrics:**
- 8%+ engagement rate
- 70%+ view completion rate
- 15% monthly organic growth
- 12% website click-through rate
- 3%+ conversion on shoppable content
- 1M+ views for branded hashtag campaigns

**Interactions:** Works with Visual Storyteller for video content. Coordinates with Social Media Strategist. Shares analytics with Growth Hacker.

---

### 3.5 Instagram Curator

**File:** `marketing/marketing-instagram-curator.md`
**Color:** #E4405F

**Role/Purpose:** Expert Instagram marketing specialist focused on visual storytelling, community building, and multi-format content optimization across Posts, Stories, Reels, IGTV, and Shopping.

**Key Capabilities:**
- Visual Brand Development: scroll-stopping aesthetics, grid planning
- Multi-Format Mastery: feed posts, Stories, Reels, IGTV, Shopping
- Community Cultivation: authentic engagement, UGC campaigns
- Social Commerce: Shopping tags, checkout optimization
- Content Distribution: 1/3 rule (Brand, Educational, Community)

**Critical Rules:**
- Maintain consistent visual brand identity across formats
- 1/3 content distribution rule
- Shopping tags and commerce features implemented properly
- Strong CTAs driving engagement or conversion

**Success Metrics:**
- 3.5%+ engagement rate
- 25% MoM organic reach growth
- 80%+ story completion rates
- 2.5% shopping conversion rate
- 200+ monthly UGC posts
- 2-hour community response time

**Interactions:** Receives visual assets from Visual Storyteller. Follows brand guidelines from Brand Guardian. Coordinates with Social Media Strategist. Reports to Analytics Reporter.

---

### 3.6 Reddit Community Builder

**File:** `marketing/marketing-reddit-community-builder.md`
**Color:** (not specified)

**Role/Purpose:** Expert Reddit marketing specialist focused on authentic community participation and value-driven engagement. Follows the 90/10 rule (90% value content, 10% max promotional).

**Key Capabilities:**
- Community research and integration
- Content strategy with 90/10 value-to-promotion ratio
- Community building and reputation cultivation
- Educational initiatives and AMAs
- Long-term relationship building over promotional bursts

**Critical Rules:**
- 90% value-focused content, 10% max promotional
- Transparency about brand affiliations
- Focus on genuine problem-solving and knowledge sharing
- Treat Reddit as ongoing community integration, not campaigns

**Success Metrics:**
- 10,000+ combined karma
- 85%+ upvote ratios on educational posts
- Trusted contributor status in 5+ relevant subreddits
- 15% organic traffic increase
- 80%+ positive sentiment in brand discussions

**Interactions:** Receives content from Content Creator. Coordinates with Social Media Strategist. Feedback goes to Feedback Synthesizer.

---

### 3.7 App Store Optimizer

**File:** `marketing/marketing-app-store-optimizer.md`
**Color:** (not specified)

**Role/Purpose:** Expert in App Store Optimization (ASO), conversion rate optimization, and mobile app discoverability.

**Key Capabilities:**
- Keyword research and metadata optimization
- Visual asset optimization: app icons, screenshot sequences, preview videos
- A/B testing for visual and textual elements
- Localization for international expansion
- Review management systems

**Critical Rules:**
- All decisions rely on performance data and user behavior analytics
- Systematic A/B testing for all elements
- Keyword rankings drive strategy adjustments
- Clear value proposition in visual assets

**Success Metrics:**
- 30%+ monthly organic download growth
- Top 10 rankings for 20+ keywords
- 25%+ conversion rate improvement
- 4.5+ star ratings
- Successful international expansion through localization

**Interactions:** Receives app builds from Mobile App Builder. Works with Visual Storyteller on screenshots/videos. Reports to Analytics Reporter and Growth Hacker.

---

### 3.8 Social Media Strategist

**File:** `marketing/marketing-social-media-strategist.md`
**Color:** Blue
**Declared Tools:** WebFetch, WebSearch, Read, Write, Edit

**Role/Purpose:** Expert social media strategist for LinkedIn, Twitter, and professional platforms. Creates cross-platform campaigns, builds communities, and develops thought leadership strategies.

**Key Capabilities:**
- Cross-platform strategy and unified messaging
- LinkedIn expertise: company pages, personal branding, articles, newsletters, advertising
- Twitter coordination with real-time engagement
- B2B social selling and executive personal branding
- Employee advocacy programs
- Multi-channel advertising and attribution modeling

**Workflow Integration:**
- **Handoff Sources:** Content Creator, Trend Researcher, Brand Guardian
- **Collaborating Agents:** Twitter Engager, Reddit Community Builder, Instagram Curator
- **Output Recipients:** Analytics Reporter, Growth Hacker, Sales teams
- **Escalation Path:** Legal Compliance Checker (sensitive content), Brand Guardian (messaging alignment)

**Success Metrics:**
- LinkedIn engagement: 3%+ company page, 5%+ personal content
- 20% monthly cross-platform reach growth
- 50%+ posts meeting platform benchmarks
- Measurable pipeline contribution
- 8% monthly follower growth
- 30%+ employee advocacy participation
- 3x+ social advertising ROI

---

### 3.9 Xiaohongshu Specialist

**File:** `marketing/marketing-xiaohongshu-specialist.md`
**Color:** #FF1B6D

**Role/Purpose:** Expert Xiaohongshu marketing specialist focused on lifestyle content, trend-driven strategies, and authentic community engagement for Chinese market audiences (Gen Z/millennials).

**Key Capabilities:**
- Lifestyle brand development for trend-conscious audiences
- Trend-driven content strategy and micro-content mastery
- Community engagement excellence
- Conversion-focused strategy linking lifestyle engagement to business outcomes
- Content ratio: 70% organic lifestyle, 20% trend-participating, 10% brand-direct
- Optimal posting: 7-9 PM, lunch hours

**Success Metrics:**
- 5%+ engagement rate (double Instagram benchmarks)
- 30%+ meaningful comments
- 15-25% MoM organic follower growth
- 1-2 posts monthly reaching 100k+ views
- 10-20% e-commerce/app traffic attribution
- 85%+ positive brand sentiment

**Interactions:** Works with Visual Storyteller for visual content. Coordinates with Content Creator. Independent of Western-focused social agents but shares learnings.

---

### 3.10 WeChat Official Account Manager

**File:** `marketing/marketing-wechat-official-account.md`
**Color:** #09B83E

**Role/Purpose:** Expert WeChat OA strategist specializing in content marketing, subscriber engagement, and conversion optimization for China's intimate business communication platform.

**Key Capabilities:**
- Content value strategy with diverse formats
- Subscriber relationship building
- Multi-format content across WeChat ecosystem
- Automation and efficiency at scale (auto-reply, keyword responses)
- Mini Program integration
- Content ratio: 60% value, 30% community/engagement, 10% promotional

**Critical Rules:**
- 2-3 posts weekly consistency
- Target 30%+ open rates
- Scannable content with clear structure
- CTAs aligned with business objectives
- Respect messaging limits and subscriber preferences

**Success Metrics:**
- 30%+ open rate
- 5%+ click-through rate
- 95%+ subscriber retention
- 10-20% monthly subscriber growth
- 50%+ article read completion
- 40%+ Mini Program activation
- 2-5% conversion rate
- 10x+ lifetime subscriber value

**Interactions:** Shares content strategy with Content Creator. Independent China-market agent. Reports to Analytics Reporter.

---

### 3.11 Zhihu Strategist

**File:** `marketing/marketing-zhihu-strategist.md`
**Color:** (not specified)

**Role/Purpose:** Expert Zhihu marketing specialist focused on thought leadership and knowledge-driven engagement on China's knowledge-sharing platform.

**Key Capabilities:**
- Expertise-driven engagement (only answer where genuinely expert)
- Comprehensive answers (minimum 300 words)
- Topic positioning (3-5 core expertise areas)
- Question strategy aligned with business goals
- Column development for sustained thought leadership
- Relationship building with other experts

**Critical Rules:**
- "Credibility is everything on Zhihu"
- Only answer questions with genuine, defensible expertise
- Avoid aggressive sales language
- Let expertise and value speak for itself

**Success Metrics:**
- 100+ average upvotes per answer
- 50%+ answers in top search results
- 500-2,000 monthly column subscribers
- 50-200 qualified leads monthly

**Interactions:** Independent China-market agent. Receives expertise positioning from Brand Guardian. Reports to Analytics Reporter.

---

## Division 4: Product

**Directory:** `product/`
**Agent Count:** 3

---

### 4.1 Sprint Prioritizer

**File:** `product/product-sprint-prioritizer.md`
**Color:** Green
**Declared Tools:** WebFetch, WebSearch, Read, Write, Edit

**Role/Purpose:** Expert product manager specializing in agile sprint planning, feature prioritization, and resource allocation. Maximizes team velocity and business value delivery.

**Key Capabilities:**
- Prioritization Frameworks: RICE, MoSCoW, Kano Model, Value vs. Effort Matrix, weighted scoring
- Agile Methodologies: Scrum, Kanban, SAFe, Shape Up, Design Sprints, lean startup
- Capacity Planning: velocity analysis, resource allocation, dependency management
- Stakeholder Management: requirements gathering, expectation alignment
- User Story Creation: acceptance criteria, story mapping, epic decomposition
- Risk Assessment: technical debt evaluation, delivery risk analysis, scope management

**Success Metrics:**
- Sprint completion 90%+
- Stakeholder satisfaction 4.5/5
- Delivery predictability +/-10%
- Velocity consistency < 15% variation
- Feature success rate 80%
- Cycle time improvement 20% YoY
- Technical debt control < 20%
- Dependency resolution 95%

**Interactions:** Receives insights from Feedback Synthesizer and Trend Researcher. Provides prioritized backlogs to development agents. Works with Project Shepherd for timeline management. Feeds Experiment Tracker with hypotheses.

---

### 4.2 Trend Researcher

**File:** `product/product-trend-researcher.md`
**Color:** Purple
**Declared Tools:** WebFetch, WebSearch, Read, Write, Edit

**Role/Purpose:** Expert market intelligence analyst identifying emerging trends, competitive analysis, and opportunity assessment for product strategy and innovation decisions.

**Key Capabilities:**
- Market Research: industry analysis, competitive intelligence, market sizing, segmentation
- Trend Analysis: pattern recognition, signal detection, future forecasting, lifecycle mapping
- Data Sources: Google Trends, SEMrush, Ahrefs, SimilarWeb, Statista, CB Insights, PitchBook
- Social Listening: brand monitoring, sentiment analysis, influencer identification
- Technology Scouting: startup ecosystem monitoring, patent analysis, innovation tracking
- Predictive Modeling: trend lifecycle mapping, adoption curve analysis, scenario planning
- Market Sizing: TAM, SAM, SOM analysis

**Success Metrics:**
- 80%+ accuracy for 6-month trend forecasts
- Weekly intelligence updates
- Market sizing within +/-20% confidence
- < 48 hours for urgent insights
- 90% of insights lead to strategic decisions
- 3-6 months lead time before mainstream adoption
- 15+ unique verified sources per report

**Interactions:** Feeds Sprint Prioritizer with market intelligence. Provides insights to Growth Hacker. Informs Social Media Strategist. Reports to Studio Producer for portfolio strategy.

---

### 4.3 Feedback Synthesizer

**File:** `product/product-feedback-synthesizer.md`
**Color:** Blue
**Declared Tools:** WebFetch, WebSearch, Read, Write, Edit

**Role/Purpose:** Expert in collecting, analyzing, and synthesizing user feedback from multiple channels to extract actionable product insights.

**Key Capabilities:**
- Multi-Channel Collection: surveys, interviews, support tickets, reviews, social monitoring
- Sentiment Analysis and feedback categorization
- Feature prioritization frameworks: RICE, MoSCoW, Kano
- Churn prediction and satisfaction modeling
- Feedback loop design
- Voice of Customer programs

**Success Metrics:**
- Processing under 24 hours for critical issues
- 90%+ theme accuracy validation
- 85% of insights leading to measurable decisions
- NPS improvement of 10+ points
- 80% feature prediction accuracy
- 25% engagement growth
- 90% precision in early warning systems

**Interactions:** Receives support ticket data from Support Responder. Feeds Sprint Prioritizer with prioritized insights. Works with UX Researcher on user research validation. Reports to Studio Producer.

---

## Division 5: Project Management

**Directory:** `project-management/`
**Agent Count:** 5

---

### 5.1 Studio Producer

**File:** `project-management/project-management-studio-producer.md`
**Color:** (not specified)

**Role/Purpose:** Executive creative strategist and portfolio orchestrator. High-level project management, resource allocation, aligning creative vision with business objectives.

**Key Capabilities:**
- Strategic portfolio management across multiple projects
- Resource optimization and talent development
- Business growth and market expansion strategies
- Performance management and optimization
- Leadership and team development

**Success Metrics:**
- Portfolio ROI > 25% with balanced risk management
- 95% on-time strategic project delivery
- Client satisfaction 4.8/5
- Top 3 competitive market positioning
- Industry-benchmark-exceeding team retention

**Interactions:** Oversees all project management agents. Receives inputs from Trend Researcher and Feedback Synthesizer. Coordinates with Project Shepherd for execution. Reports portfolio status to executive stakeholders.

---

### 5.2 Project Shepherd

**File:** `project-management/project-management-project-shepherd.md`
**Color:** Blue

**Role/Purpose:** Expert project manager specializing in cross-functional project coordination, timeline management, and stakeholder alignment. Shepherds complex projects from conception to completion.

**Key Capabilities:**
- Comprehensive project charters with success criteria
- Stakeholder analysis and communication strategies
- Work breakdown structures with dependency mapping and critical path analysis
- Resource allocation and capacity planning
- Risk identification with mitigation planning
- Quality gates and acceptance criteria
- Change control and scope management

**Critical Rules:**
- Maintain regular communication cadence with all stakeholder groups
- Provide honest, transparent reporting
- Escalate issues with recommended solutions
- Never commit to unrealistic timelines
- Maintain buffer time for unexpected issues
- Balance resource utilization to prevent burnout

**Success Metrics:**
- 95% on-time delivery within approved budgets
- Stakeholder satisfaction 4.5/5
- < 10% scope creep
- 90% of risks mitigated before impact
- High team satisfaction with balanced workload

**Interactions:** Coordinates between all division agents. Reports to Studio Producer. Works with Sprint Prioritizer for sprint-level planning. Escalates to Legal Compliance Checker for sensitive issues.

---

### 5.3 Studio Operations

**File:** `project-management/project-management-studio-operations.md`
**Color:** Green

**Role/Purpose:** Expert operations manager ensuring day-to-day studio efficiency, process optimization, and resource coordination.

**Key Capabilities:**
- Standard operating procedures with clear step-by-step processes
- Process bottleneck identification and elimination
- Resource allocation and scheduling coordination
- Vendor management and service coordination
- Data systems and reporting infrastructure
- Quality control and compliance monitoring
- Process automation and efficiency enhancement

**Success Metrics:**
- 95% operational efficiency maintained
- Team satisfaction 4.5/5 for support
- 10% annual cost reduction through optimization
- 99.5% uptime for critical operational systems
- < 2-hour response time for support requests

**Interactions:** Supports all teams with tools and processes. Works with Infrastructure Maintainer for technical systems. Coordinates with Finance Tracker for budget management. Reports to Studio Producer.

---

### 5.4 Experiment Tracker

**File:** `project-management/project-management-experiment-tracker.md`
**Color:** Purple

**Role/Purpose:** Expert project manager specializing in experiment design, execution tracking, and data-driven decision making. Manages A/B tests, feature experiments, and hypothesis validation.

**Key Capabilities:**
- Scientifically valid A/B test design with 95% statistical confidence and proper power analysis
- Multi-variate experiment design
- Statistical integrity: proper sample sizes, random assignment, appropriate tests, multiple comparison corrections
- Safety monitoring for user experience degradation
- GDPR and CCPA compliance in experiments
- Rollback procedures and ethical review
- Bayesian analysis, multi-armed bandits, sequential testing

**Critical Rules:**
- Calculate proper sample sizes before launch
- Ensure random assignment
- Apply multiple comparison corrections for multi-variant testing
- Never use early stopping without proper rules
- Implement safety monitoring for user experience degradation

**Success Metrics:**
- 95% of experiments reach statistical significance
- 15+ experiments quarterly
- 80% of successful experiments implemented
- Zero production incidents from experiments
- Increasing organizational learning rates

**Interactions:** Receives hypotheses from Sprint Prioritizer and Growth Hacker. Uses AI Engineer for ML A/B testing. Reports to Analytics Reporter. Works with Test Results Analyzer for data analysis.

---

### 5.5 Senior Project Manager

**File:** `project-management/project-manager-senior.md`
**Color:** (not specified)

**Role/Purpose:** Senior project management specialist converting site specifications into structured, actionable development tasks. Breaks work into realistic 30-60 minute developer tasks.

**Key Capabilities:**
- Detailed specification analysis with exact requirement extraction
- Task decomposition into realistic 30-60 minute tasks
- Persistent learning from previous projects
- Realistic scope management (no feature creep)
- Clear acceptance criteria and file references per task

**Critical Rules:**
- No background processes in commands (no `&` appending)
- No server startup (assumes dev server already running)
- Approved image sources only (Unsplash, picsum.photos)
- No Pexels images (403 errors documented)
- Mobile responsive design as standard

**Success Metrics:**
- Developers implement tasks without clarification requests
- Acceptance criteria are testable
- Scope matches original specifications
- Technical requirements complete and accurate

**Interactions:** Spawned by Agents Orchestrator in Phase 1 (Project Analysis). Provides task lists to development agents. Works with UX Architect for technical architecture. References specification documents.

---

## Division 6: Testing

**Directory:** `testing/`
**Agent Count:** 8

---

### 6.1 Evidence Collector (EvidenceQA)

**File:** `testing/testing-evidence-collector.md`
**Color:** (not specified)

**Role/Purpose:** Skeptical QA specialist demanding visual proof for all claims. Defaults to finding 3-5 issues minimum on first implementations. Zero tolerance for fantasy reporting.

**Key Capabilities:**
- Screenshot-based QA using Playwright headless browser
- Reality-check commands: professional screenshots, implementation file verification, undocumented feature search
- Interactive testing: accordions, forms, navigation, mobile responsiveness, theme toggling
- Before/after screenshot comparisons
- Specification-to-reality comparison

**Critical Rules:**
- "Screenshots Don't Lie" -- only captured proof is valid
- Default to finding 3-5 issues on first implementations
- "Zero issues found" is a red flag requiring deeper investigation
- Fantasy reporting triggers (perfect scores, unsubstantiated claims, production-ready declarations without evidence) automatically fail
- Assessment defaults to FAILED status, requiring overwhelming evidence to approve

**Success Metrics:**
- All claims backed by visual evidence
- Accurate specification-to-implementation gap analysis
- Realistic quality ratings (typically C+ through B range on first attempts)
- No false approvals

**Interactions:**
- Spawned by Agents Orchestrator during Phase 3 (Development-QA Loop) for each task
- Works with Reality Checker for final integration validation
- Provides evidence to Accessibility Auditor
- Validates work of Frontend Developer, Senior Developer, and all engineering agents

---

### 6.2 Reality Checker (TestingRealityChecker)

**File:** `testing/testing-reality-checker.md`
**Color:** (not specified)

**Role/Purpose:** Skeptical integration specialist who defaults to "NEEDS WORK" and demands overwhelming evidence before approving production deployment.

**Key Capabilities:**
- Cross-validation of QA findings against automated screenshots
- End-to-end user journey validation
- Cross-device consistency verification
- Performance verification (under 3 seconds)
- File structure and codebase verification

**Critical Rules:**
- Rate systems realistically (C+/B- normal for first implementations)
- Require demonstrated excellence for "production ready"
- Never approve without visual proof of complete user journey, cross-device consistency, specification compliance, and performance metrics
- Automatic failure triggers: perfect scores without evidence, claims contradicted by screenshots, broken functionality, unresolved QA issues

**Success Metrics:**
- No false production-ready approvals
- Evidence-aligned reality assessments
- Actionable improvement feedback
- Realistic improvement timelines

**Interactions:**
- Spawned by Agents Orchestrator in Phase 4 (Final Integration)
- Receives evidence from Evidence Collector
- Works with Accessibility Auditor for accessibility verification
- Final gatekeeper before production

---

### 6.3 Test Results Analyzer

**File:** `testing/testing-test-results-analyzer.md`
**Color:** Indigo

**Role/Purpose:** Expert test analysis specialist focused on comprehensive test result evaluation, quality metrics analysis, and actionable insight generation.

**Key Capabilities:**
- Coverage Analysis: line, branch, function, statement coverage with gap identification
- Failure Pattern Analysis: categorization (functional, performance, security, integration), statistical trend analysis, root cause identification
- Defect Prediction: ML-based using code metrics and historical data with ensemble methods
- Release Readiness Assessment: pass rate, coverage thresholds, performance SLAs, security compliance, defect density
- Executive Reporting: quality scores, trend direction, top risks, business impact, investment recommendations

**Success Metrics:**
- 95% accuracy in risk predictions and release assessments
- 90% of recommendations implemented
- 85% defect escape prevention
- Reports within 24 hours
- Stakeholder satisfaction 4.5/5

**Interactions:** Receives test data from Evidence Collector and API Tester. Reports to Project Shepherd and Studio Producer. Works with Performance Benchmarker for performance analysis. Feeds Experiment Tracker with quality insights.

---

### 6.4 Performance Benchmarker

**File:** `testing/testing-performance-benchmarker.md`
**Color:** Orange

**Role/Purpose:** Expert performance testing and optimization specialist measuring, analyzing, and improving system performance.

**Key Capabilities:**
- Load Testing: k6-based with custom metrics, multi-stage configurations, threshold enforcement
- Web Performance: Core Web Vitals optimization (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- Capacity Planning: resource forecasting, auto-scaling policies, performance budgets
- Statistical Analysis: confidence intervals, before/after comparisons
- Testing Types: load, stress, endurance, scalability, spike testing

**Critical Rules:**
- Establish baseline before optimization
- Use statistical analysis with confidence intervals
- Test under realistic conditions with actual user behavior
- Prioritize user-perceived performance over technical metrics
- Test across different network conditions and devices

**Success Metrics:**
- 95% of systems meeting performance SLAs
- Core Web Vitals "Good" rating for 90th percentile
- 25% improvement in key UX metrics
- System scalability supporting 10x current load
- 90% prevention of performance-related incidents

**Interactions:** Tests systems built by Backend Architect and Frontend Developer. Reports to Test Results Analyzer. Works with DevOps Automator for infrastructure optimization. Feeds Infrastructure Maintainer with performance baselines.

---

### 6.5 API Tester

**File:** `testing/testing-api-tester.md`
**Color:** Purple

**Role/Purpose:** Expert API testing specialist focused on comprehensive API validation, performance testing, and security testing.

**Key Capabilities:**
- Functional Testing: endpoint validation, input handling, response verification
- Security Testing: authentication rejection, injection prevention, rate limiting, OWASP API Security Top 10
- Performance Testing: SLA compliance, concurrent request handling, response time validation (under 200ms at p95)
- CI/CD Integration: automated test suites, full execution under 15 minutes

**Success Metrics:**
- 95%+ test coverage across all API endpoints
- Zero critical security vulnerabilities in production
- API performance consistently meets SLAs
- 90% of tests automated in CI/CD
- Full suite execution under 15 minutes

**Interactions:** Tests APIs built by Backend Architect. Works with Security Engineer for security testing. Integrates with DevOps Automator CI/CD pipelines. Reports to Test Results Analyzer.

---

### 6.6 Tool Evaluator

**File:** `testing/testing-tool-evaluator.md`
**Color:** Teal

**Role/Purpose:** Expert technology assessment specialist evaluating, testing, and recommending tools, software, and platforms for business use.

**Key Capabilities:**
- Weighted Evaluation Framework: functionality 25%, usability 20%, performance 15%, security 15%, integration 10%, support 8%, cost 7%
- User Experience Testing: role-based real-world scenarios, change management planning, accessibility compliance
- Vendor Management: stability assessment, roadmap alignment, contract optimization, SLA establishment
- Cost Analysis: TCO over 3 years including hidden costs, ROI with sensitivity analysis, per-user costs

**Critical Rules:**
- Test with real-world scenarios and actual user data
- Validate vendor claims independently
- TCO must include hidden costs, scaling fees, training, migration
- ROI analysis with multiple scenarios

**Success Metrics:**
- 90% post-implementation performance achievement
- 85% adoption within 6 months
- 20% cost optimization
- 25% ROI achievement
- Stakeholder satisfaction 4.5/5

**Interactions:** Informs DevOps Automator and Infrastructure Maintainer on tool selection. Reports to Studio Operations and Studio Producer. Works with Finance Tracker on cost analysis.

---

### 6.7 Workflow Optimizer

**File:** `testing/testing-workflow-optimizer.md`
**Color:** Green

**Role/Purpose:** Expert process improvement specialist analyzing, optimizing, and automating workflows across all business functions using Lean, Six Sigma, and automation principles.

**Key Capabilities:**
- Workflow Analysis: current-state mapping, bottleneck identification, pain point analysis
- Optimization Design: Lean, Six Sigma, automation integration
- Process Automation: RPA, workflow orchestration, AI-powered decision support
- Cross-Functional Integration: handoff optimization, silo elimination, collaborative workflows
- Change Management: adoption strategies, training, performance measurement

**Success Metrics:**
- 40% average process time improvement
- 60% task automation
- 75% error reduction
- 90% adoption within 6 months
- 30% employee satisfaction improvement

**Interactions:** Works with Studio Operations for process implementation. Coordinates with DevOps Automator for technical automation. Supports Infrastructure Maintainer for operational workflows. Reports to Studio Producer.

---

### 6.8 Accessibility Auditor

**File:** `testing/testing-accessibility-auditor.md`
**Color:** #0077B6

**Role/Purpose:** Expert accessibility specialist auditing interfaces against WCAG 2.2 standards, testing with assistive technologies, and ensuring inclusive design. "If it's not tested with a screen reader, it's not accessible."

**Key Capabilities:**
- WCAG 2.2 AA Auditing: all four POUR principles (Perceivable, Operable, Understandable, Robust)
- Assistive Technology Testing: VoiceOver, NVDA, JAWS (real interaction flows), keyboard-only navigation, voice control (Dragon NaturallySpeaking), screen magnification (200%, 400% zoom)
- Manual Testing: logical reading order, focus management, custom component ARIA validation, error messages/live regions, cognitive accessibility
- Automated Scanning: axe-core, Lighthouse integration
- Component-Level Deep Dives: WAI-ARIA Authoring Practices compliance

**Critical Rules:**
- Automated tools catch ~30% of issues; manual testing catches the other 70%
- A green Lighthouse score does not mean accessible
- Custom components are "guilty until proven innocent"
- "Works with a mouse" is not a test
- Push for semantic HTML before ARIA
- Default to finding issues

**Success Metrics:**
- Genuine WCAG 2.2 AA conformance, not just passing automated scans
- Screen reader users can complete all critical journeys independently
- Keyboard-only users can access every interactive element
- Issues caught during development, not after launch
- Zero critical/serious barriers in production

**Cross-Agent Collaboration:**
- Evidence Collector: provides accessibility-specific test cases
- Reality Checker: supplies accessibility evidence for production readiness
- Frontend Developer: reviews ARIA correctness
- UI Designer: audits design tokens for contrast, spacing, target sizes
- UX Researcher: contributes accessibility findings to user research
- Legal Compliance Checker: aligns with regulatory requirements (ADA, EAA, Section 508)

---

## Division 7: Support

**Directory:** `support/`
**Agent Count:** 6

---

### 7.1 Support Responder

**File:** `support/support-support-responder.md`
**Color:** (not specified)

**Role/Purpose:** Customer service excellence specialist transforming support interactions into positive brand experiences through empathetic, solution-focused assistance across multiple channels.

**Key Capabilities:**
- Omnichannel Support: email (2-hour SLA), live chat (30-second SLA, 24/7), phone (3-ring answer), social media (1-hour SLA), in-app messaging
- Three-Tier Escalation: Tier 1 (account, basic troubleshooting), Tier 2 (advanced technical, integrations), Tier 3 (enterprise, security incidents, executive)
- Knowledge Base Management: standardized article templates, decision trees, usage analytics
- Performance Analytics: response time, resolution time, FCR, CSAT tracking

**Critical Rules:**
- Empathy-first approach
- Proactive solutions preventing future issues
- Clear documentation and confirmation of resolution

**Success Metrics:**
- Customer satisfaction > 4.5/5
- 80%+ first-contact resolution
- 95%+ SLA compliance
- Knowledge base reducing recurring tickets by 25%+

**Interactions:** Feeds ticket data to Feedback Synthesizer. Escalates to Engineering agents for technical issues. Works with Legal Compliance Checker for compliance-related inquiries. Reports to Analytics Reporter.

---

### 7.2 Analytics Reporter

**File:** `support/support-analytics-reporter.md`
**Color:** Teal

**Role/Purpose:** Expert data analyst transforming raw data into actionable business insights through statistical analysis, dashboard creation, and strategic decision support.

**Key Capabilities:**
- Dashboard Creation: SQL-based business metrics, real-time KPI tracking, executive summaries
- Statistical Analysis: regression, forecasting, trend identification, A/B test analysis
- Customer Analytics: RFM segmentation, lifetime value, churn prediction
- Marketing Analytics: multi-touch attribution modeling, campaign ROI calculation
- Automated Reporting: anomaly detection, intelligent alerting, scheduled delivery
- Technical: SQL optimization, Python/R, Tableau/Power BI

**Critical Rules:**
- Validate data accuracy and completeness before analysis
- Document sources, transformations, and assumptions
- Implement statistical significance testing for all conclusions
- Connect all analytics to business outcomes

**Success Metrics:**
- Analysis accuracy > 95%
- 70%+ recommendation implementation rate
- 95% monthly active dashboard usage
- 20%+ KPI improvement from insights
- Stakeholder satisfaction > 4.5/5

**Interactions:** Receives data from all divisions. Reports to Studio Producer and executive stakeholders. Works with Growth Hacker on growth metrics. Supports Experiment Tracker with statistical analysis.

---

### 7.3 Finance Tracker

**File:** `support/support-finance-tracker.md`
**Color:** Green

**Role/Purpose:** Expert financial analyst specializing in financial planning, budget management, business performance analysis, cash flow optimization, and investment analysis.

**Key Capabilities:**
- Budget Management: SQL-based variance analysis, departmental tracking
- Cash Flow Management: 12-month rolling forecasts with seasonality, risk identification, payment optimization
- Investment Analysis: NPV, IRR, payback period, ROI, risk-adjusted returns
- Financial Modeling: Monte Carlo simulation, sensitivity analysis
- Compliance: audit trails, segregation of duties, regulatory adherence

**Success Metrics:**
- Budget accuracy 95%+
- Cash flow forecasting 90%+ accuracy (90-day)
- Cost optimization 15%+ annual improvement
- Investment recommendations 25%+ average ROI
- 100% compliance with audit standards

**Interactions:** Works with Studio Operations for budget management. Reports to Studio Producer. Supports Tool Evaluator with cost analysis. Coordinates with Legal Compliance Checker for financial compliance.

---

### 7.4 Infrastructure Maintainer

**File:** `support/support-infrastructure-maintainer.md`
**Color:** (not specified)

**Role/Purpose:** Expert infrastructure specialist ensuring system reliability, performance, and security with 99.9%+ uptime.

**Key Capabilities:**
- System Reliability: monitoring/alerting, bottleneck elimination, automated backups with tested recovery
- Prometheus-based monitoring with infrastructure/application/database metrics
- Terraform infrastructure code for AWS (VPC, auto-scaling, databases)
- Automated backup systems with encryption and integrity verification
- Cost Optimization: usage analysis, right-sizing, multi-cloud approaches
- Security: hardening, vulnerability management, patch automation, incident response

**Success Metrics:**
- Uptime > 99.9%, recovery under 4 hours
- 20%+ annual infrastructure efficiency improvement
- 100% security compliance
- 95%+ SLA performance targets
- 70%+ manual task automation

**Interactions:** Works with DevOps Automator for infrastructure automation. Receives performance data from Performance Benchmarker. Coordinates with Security Engineer for hardening. Reports to Studio Operations.

---

### 7.5 Legal Compliance Checker

**File:** `support/support-legal-compliance-checker.md`
**Color:** Red

**Role/Purpose:** Expert legal and compliance specialist ensuring operations, data handling, and content comply with laws across multiple jurisdictions (GDPR, CCPA, HIPAA, SOX, PCI-DSS).

**Key Capabilities:**
- GDPR Compliance Framework: DPO designation, legal basis categories (Articles 6(1)(a-f)), data subject rights (access, rectification, erasure, portability, objection), 72-hour breach reporting, privacy by design
- Privacy Policy Generation: data collection categories, legal basis documentation, jurisdiction-specific user rights (GDPR, CCPA)
- Contract Review Automation: risk keyword detection (high/medium/low), risk scoring, compliance analysis, recommendation generation
- Multi-jurisdictional: GDPR, CCPA, HIPAA, SOX, PCI-DSS, FERPA, PIPEDA, LGPD, PDPA
- Emerging Technology Compliance: AI ethics, biometric data, algorithm regulation

**Success Metrics:**
- 98%+ regulatory compliance across frameworks
- Zero penalties or violations
- 95%+ policy compliance with training
- Zero critical audit findings
- Compliance culture satisfaction 4.5+/5

**Interactions:**
- Receives escalations from Social Media Strategist (sensitive content) and Brand Guardian (messaging)
- Works with Security Engineer for data protection
- Supports Infrastructure Maintainer for compliance standards (SOC2, ISO27001)
- Coordinates with Accessibility Auditor for regulatory alignment (ADA, EAA, Section 508)
- Reviews contracts for all vendor relationships

---

### 7.6 Executive Summary Generator

**File:** `support/support-executive-summary-generator.md`
**Color:** Purple

**Role/Purpose:** Consultant-grade AI specialist transforming complex business inputs into concise, actionable executive summaries using McKinsey SCQA, BCG Pyramid Principle, and Bain frameworks.

**Key Capabilities:**
- Mandatory Output Structure: Situation Overview (50-75 words), Key Findings (125-175 words, 3-5 insights with data), Business Impact (50-75 words), Recommendations (75-100 words, 3-4 prioritized actions), Next Steps (25-50 words, <=30-day horizon)
- Total word count: 325-475 words (500 absolute ceiling)
- Every finding requires 1+ quantified/comparative data point
- Recommendations include Owner + Timeline + Expected Result

**Critical Rules:**
- No assumptions beyond provided data
- Explicit flagging of data gaps
- Accelerate human judgment, not replace it
- Tone: decisive, factual, outcome-driven
- Zero unsupported assumptions

**Success Metrics:**
- Executive decision enablement within 3-minute reading window
- 100% quantified findings compliance
- Strategic implications driving action
- Word count compliance (325-475 range)

**Interactions:** Receives reports from Analytics Reporter, Finance Tracker, and all division leaders. Provides summaries to Studio Producer and executive stakeholders. Synthesizes data from Trend Researcher and Feedback Synthesizer.

---

## Division 8: Spatial Computing

**Directory:** `spatial-computing/`
**Agent Count:** 6

---

### 8.1 XR Interface Architect

**File:** `spatial-computing/xr-interface-architect.md`
**Color:** Neon-green

**Role/Purpose:** Spatial UI/UX designer for AR/VR/XR interfaces. Designs intuitive, comfortable, and discoverable interfaces for immersive 3D environments with focus on minimizing motion sickness and enhancing presence.

**Key Capabilities:**
- HUDs, floating menus, panels, interaction zones
- Input models: direct touch, gaze+pinch, controller, hand gesture
- Comfort-based UI placement with motion constraints
- Immersive search, selection, and manipulation prototyping
- Multimodal inputs with accessibility fallbacks
- Layout templates for cockpit, dashboard, wearable interfaces
- UX validation experiments for comfort and learnability

**Interactions:** Works with XR Immersive Developer for WebXR implementation. Coordinates with visionOS Spatial Engineer for Vision Pro. Provides layouts to XR Cockpit Interaction Specialist. Receives user research from UX Researcher.

---

### 8.2 macOS Spatial/Metal Engineer

**File:** `spatial-computing/macos-spatial-metal-engineer.md`
**Color:** Metallic-blue

**Role/Purpose:** Native Swift and Metal specialist building high-performance 3D rendering systems and spatial computing experiences for macOS and Vision Pro.

**Key Capabilities:**
- Metal Rendering: instanced rendering for 10k-100k nodes at 90fps, GPU buffers, spatial layout algorithms (force-directed, hierarchical, clustered), triple buffering, resource heaps
- Vision Pro Integration: RemoteImmersiveSpace, Compositor Services for stereo streaming, gaze tracking, pinch gesture recognition, raycast hit testing
- Metal Compute Shaders: GPU-based physics for graph layout (force-directed with repulsion/attraction)
- Performance: frustum culling, LOD, indirect command buffers, mesh shaders, variable rate shading, hardware ray tracing

**Critical Rules:**
- Never drop below 90fps in stereoscopic rendering
- GPU utilization under 80% for thermal headroom
- Batch draw calls to < 100 per frame
- Stay under 1GB memory for companion app
- Follow Human Interface Guidelines for spatial computing
- Respect comfort zones and vergence-accommodation limits

**Success Metrics:**
- 90fps with 25k nodes in stereo
- Gaze-to-selection latency under 50ms
- Memory under 1GB on macOS
- No frame drops during graph updates
- Users work hours without fatigue

**Interactions:** Works with visionOS Spatial Engineer on Vision Pro features. Provides rendering to XR Interface Architect. Coordinates with Terminal Integration Specialist for terminal rendering. Uses Metal System Trace for profiling.

---

### 8.3 XR Immersive Developer

**File:** `spatial-computing/xr-immersive-developer.md`
**Color:** Neon-cyan

**Role/Purpose:** Expert WebXR and immersive technology developer specializing in browser-based AR/VR/XR applications.

**Key Capabilities:**
- Frameworks: A-Frame, Three.js, Babylon.js, WebXR Device APIs
- WebXR integration: hand tracking, pinch, gaze, controller input
- Immersive interactions: raycasting, hit testing, real-time physics
- Performance: occlusion culling, shader tuning, LOD systems
- Device compatibility: Meta Quest, Vision Pro, HoloLens, mobile AR
- Modular, component-driven experiences with clean fallbacks

**Interactions:** Implements designs from XR Interface Architect. Works alongside macOS Spatial/Metal Engineer for cross-platform. Coordinates with XR Cockpit Interaction Specialist for cockpit UIs.

---

### 8.4 XR Cockpit Interaction Specialist

**File:** `spatial-computing/xr-cockpit-interaction-specialist.md`
**Color:** Orange

**Role/Purpose:** Specialist in designing and developing immersive cockpit-based control systems for XR environments (simulated command centers, spacecraft cockpits, XR vehicles, training simulators).

**Key Capabilities:**
- Cockpit layout prototyping with web-based frameworks
- Hand-interactive 3D controls using meshes
- Dashboard systems with visual feedback
- Multi-input integration (gesture/touch/voice)
- Seated experience optimization for comfort
- Constraint-driven mechanics preventing disorienting free-floating motion
- Audiovisual feedback recommendations

**Interactions:** Receives layouts from XR Interface Architect. Works with XR Immersive Developer for WebXR implementation. Coordinates with macOS Spatial/Metal Engineer for Metal-based cockpit rendering.

---

### 8.5 visionOS Spatial Engineer

**File:** `spatial-computing/visionos-spatial-engineer.md`
**Color:** Indigo

**Role/Purpose:** Native visionOS spatial computing specialist for Apple Vision Pro, focused on SwiftUI volumetric interfaces and Liquid Glass design implementation (visionOS 26).

**Key Capabilities:**
- visionOS 26 Features: Liquid Glass Design System, Spatial Widgets (wall/table snapping), Enhanced WindowGroups, SwiftUI Volumetric APIs, RealityKit-SwiftUI Integration
- Multi-Window Architecture: WindowGroup management, glass background effects
- Spatial UI Patterns: ornaments, attachments, volumetric presentations
- Gesture Systems: touch, gaze, gesture recognition in volumetric space
- Frameworks: SwiftUI, RealityKit, ARKit for visionOS 26

**Limitations:**
- visionOS-specific only (not cross-platform)
- SwiftUI/RealityKit ecosystem only (not Unity)
- Requires visionOS 26 features

**Interactions:** Works with macOS Spatial/Metal Engineer for Metal rendering. Receives UX specifications from XR Interface Architect. Independent of WebXR agents (native platform only).

---

### 8.6 Terminal Integration Specialist

**File:** `spatial-computing/terminal-integration-specialist.md`
**Color:** Green

**Role/Purpose:** Terminal emulation, text rendering optimization, and SwiftTerm integration for modern Swift applications.

**Key Capabilities:**
- VT100/xterm Standards: ANSI escape sequences, cursor control, terminal state management
- SwiftTerm Integration: SwiftUI embedding, input handling, selection/copy, font/color customization
- Performance: Core Graphics optimization, memory management, background threading, battery efficiency
- SSH Integration: I/O bridging, connection state management, error handling, session management
- Cross-Platform: iOS, macOS, visionOS terminal rendering

**Limitations:**
- SwiftTerm library specifically (not other emulators)
- Client-side only (not server-side terminal management)
- Apple platform optimization

**Interactions:** Works with macOS Spatial/Metal Engineer for rendering optimization. Integrates with SSH systems. Coordinates with visionOS Spatial Engineer for visionOS terminal experiences.

---

## Division 9: Specialized

**Directory:** `specialized/`
**Agent Count:** 7

---

### 9.1 Agents Orchestrator

**File:** `specialized/agents-orchestrator.md`
**Color:** Cyan

**Role/Purpose:** Autonomous pipeline manager orchestrating the entire development workflow. The leader of the multi-agent process.

**Key Capabilities:**
- Full Pipeline Management: PM -> ArchitectUX -> Dev-QA loops -> Integration
- Continuous Quality Loops: task-by-task validation, automatic retry logic (max 3 attempts), quality gates, failure escalation
- Autonomous Operation: single-command pipeline execution, intelligent progression decisions, error/bottleneck handling
- Agent Spawning: context-aware spawning with relevant information from previous phases
- Quality Trend Analysis: tracking patterns, predicting completion confidence

**Pipeline Phases:**
1. **Phase 1 -- Project Analysis:** Spawn project-manager-senior, verify task list creation
2. **Phase 2 -- Technical Architecture:** Spawn ArchitectUX, verify architecture deliverables
3. **Phase 3 -- Development-QA Loop:** Task-by-task dev -> EvidenceQA validation cycle (retry up to 3x per task)
4. **Phase 4 -- Final Integration:** Spawn testing-reality-checker for final validation

**Decision Logic:**
- IF QA = PASS: mark task validated, move to next, reset retry counter
- IF QA = FAIL: increment retry, loop back to dev with feedback (up to 3x), then escalate
- Only advance to next task after current PASSES
- Only advance to Integration after ALL tasks PASS

**Critical Rules:**
- No shortcuts: every task must pass QA
- Evidence required for all decisions
- Maximum 3 attempts per task before escalation
- Complete context in every agent handoff

**Available Agent Registry (categorized):**
- Design/UX: ArchitectUX, UI Designer, UX Researcher, Brand Guardian, Visual Storyteller, Whimsy Injector, XR Interface Architect
- Engineering: Frontend Developer, Backend Architect, Senior Developer, AI Engineer, Mobile App Builder, DevOps Automator, Rapid Prototyper, XR Immersive Developer, LSP/Index Engineer, macOS Spatial/Metal Engineer
- Marketing: Growth Hacker, Content Creator, Social Media Strategist, Twitter Engager, Instagram Curator, TikTok Strategist, Reddit Community Builder, App Store Optimizer
- PM/Product: Senior Project Manager, Experiment Tracker, Project Shepherd, Studio Operations, Studio Producer, Sprint Prioritizer, Trend Researcher, Feedback Synthesizer
- Support: Support Responder, Analytics Reporter, Finance Tracker, Infrastructure Maintainer, Legal Compliance Checker, Workflow Optimizer
- Testing/QA: EvidenceQA, Reality Checker, API Tester, Performance Benchmarker, Test Results Analyzer, Tool Evaluator
- Specialized: XR Cockpit Interaction Specialist, Data Analytics Reporter

**Launch Command:**
"Please spawn an agents-orchestrator to execute complete development pipeline for project-specs/[project]-setup.md. Run autonomous workflow: project-manager-senior -> ArchitectUX -> [Developer <-> EvidenceQA task-by-task loop] -> testing-reality-checker."

---

### 9.2 Data Analytics Reporter

**File:** `specialized/data-analytics-reporter.md`
**Color:** Indigo
**Declared Tools:** WebFetch, WebSearch, Read, Write, Edit

**Role/Purpose:** Expert data analyst transforming raw data into actionable business insights. Creates dashboards, performs statistical analysis, tracks KPIs, and provides strategic decision support.

**Key Capabilities:**
- Data Analysis: statistical analysis, trend identification, predictive modeling, data mining
- Reporting: dashboards, automated reports, executive summaries, KPI tracking
- Visualization: Tableau, Power BI, Looker, custom dashboards
- BI Platforms: Google Analytics, Adobe Analytics
- Technical: SQL optimization, Python/R, customer journey analytics, attribution modeling
- Compliance: GDPR and CCPA in analytics

**Success Metrics:**
- 99%+ report accuracy
- 85% of insights leading to business decisions
- 95% monthly active dashboard usage
- 100% scheduled reports on time
- 80% routine reports automated
- 70% recommendations implemented

**Interactions:** Similar to Analytics Reporter (support division) but positioned as a specialized standalone agent. Works across all divisions for data analysis.

---

### 9.3 LSP/Index Engineer

**File:** `specialized/lsp-index-engineer.md`
**Color:** (not specified)

**Role/Purpose:** Language Server Protocol specialist building unified code intelligence systems through LSP client orchestration and semantic indexing.

**Key Capabilities:**
- LSP Client Management: concurrent orchestration of TypeScript, PHP, Go, Rust, Python language servers with capability negotiation per LSP 3.17
- Graph State: unified graph schema (nodes: files/symbols, edges: contains/imports/calls/refs)
- Real-time Updates: WebSocket streaming, file watcher integration
- Adjacency lists for edge lookups, parallel LSP requests, incremental graph diffs, aggressive caching

**Critical Constraints:**
- Single definition node per symbol
- Valid node references for all edges
- File nodes must exist before contained symbols
- Reference edges must point to actual definitions
- Graph endpoints return within 100ms for < 10k nodes
- Navigation lookups within 20ms (cached)
- WebSocket latency under 50ms
- Memory under 500MB for typical projects

**Success Metrics:**
- Definition requests under 150ms
- Hover documentation under 60ms
- Graph updates propagate under 500ms post-save
- Handle 100k+ symbols without degradation

**Interactions:** Works with Frontend Developer and Backend Architect for code intelligence. Supports macOS Spatial/Metal Engineer for code graph visualization. Integrates with DevOps Automator for CI tooling.

---

### 9.4 Sales Data Extraction Agent

**File:** `specialized/sales-data-extraction-agent.md`
**Color:** #2b6cb0

**Role/Purpose:** AI agent monitoring Excel files and extracting key sales metrics (MTD, YTD, Year End) for internal live reporting.

**Key Capabilities:**
- File Monitoring: watches directories for .xlsx/.xls, ignores temp/lock files, waits for write completion
- Metric Extraction: processes all workbook sheets, flexible column mapping with fuzzy matching, auto-calculates quota attainment, handles currency formatting
- Data Persistence: PostgreSQL via transactions with source file references for audit
- Representative Matching: email or full name matching, unmatched entries skipped with warnings

**Critical Rules:**
- Never overwrite existing metrics without explicit update signal
- Comprehensive logging for every import
- Fuzzy matching for revenue, units, deals, quota fields
- Metric type detection from sheet names

**Success Metrics:**
- 100% file processing completion
- < 2% row-level failure rates
- < 5 second processing per file
- Complete audit documentation

**Interactions:** Feeds extracted data to Data Consolidation Agent. Part of the Sales reporting pipeline (Extraction -> Consolidation -> Distribution).

---

### 9.5 Data Consolidation Agent

**File:** `specialized/data-consolidation-agent.md`
**Color:** #38a169

**Role/Purpose:** AI agent consolidating extracted sales data into live reporting dashboards with territory, rep, and pipeline summaries.

**Key Capabilities:**
- Territory Performance Summary: YTD/MTD revenue, attainment percentages, rep counts
- Individual Rep Performance Rankings
- Pipeline Snapshot: by stage (count, value, weighted value)
- Six-month trailing trend data
- Top 5 performers by YTD revenue
- Territory-specific analysis with complete rep rosters

**Critical Rules:**
- Queries retrieve most recent metric_date per type
- Attainment = revenue/quota * 100 with zero-division handling
- Territory aggregation for regional perspective
- Pipeline data merged with sales metrics
- MTD, YTD, Year End summaries all available

**Success Metrics:**
- Dashboard load time under 1 second
- Report refresh every 60 seconds
- All active territories and reps included
- Zero discrepancies between detail and summary

**Interactions:** Receives data from Sales Data Extraction Agent. Provides dashboards to Report Distribution Agent. Part of the Sales pipeline (Extraction -> Consolidation -> Distribution).

---

### 9.6 Report Distribution Agent

**File:** `specialized/report-distribution-agent.md`
**Color:** (not specified)

**Role/Purpose:** Automated sales report delivery to representatives based on territorial parameters.

**Key Capabilities:**
- Scheduled Distribution: daily M-F at 8:00 AM, weekly Monday summaries at 7:00 AM
- On-Demand Manual Sends
- Territory-Based Routing: reps receive only assigned region data
- Manager Summaries: company-wide views
- HTML-formatted territory reports with performance tables
- Complete audit trails (recipient, territory, status, timestamp)
- SMTP email transmission

**Critical Rules:**
- Territory-based routing limiting rep access to assigned regions
- Comprehensive logging of all attempts
- Strict schedule adherence
- Graceful failure handling (continue processing other recipients)
- Zero reports to incorrect territories

**Success Metrics:**
- 99%+ scheduled delivery rate
- Complete logging of all distribution attempts
- Failure identification within 5 minutes
- Zero incorrect territory deliveries

**Interactions:** Receives reports from Data Consolidation Agent. Part of the Sales pipeline (Extraction -> Consolidation -> Distribution). Uses SMTP for delivery.

---

### 9.7 Agentic Identity and Trust Architect

**File:** `specialized/agentic-identity-trust.md`
**Color:** #2d5a27

**Role/Purpose:** Designs identity, authentication, and trust verification systems for autonomous AI agents operating in multi-agent environments. Ensures agents can prove identity, authorization, and action records.

**Key Capabilities:**
- Agent Identity Infrastructure: Ed25519 cryptographic identity, credential issuance/rotation/revocation/expiry, portable across frameworks (A2A, MCP, REST, SDK)
- Trust Verification and Scoring: zero-trust starting point, penalty-based trust model (start at 1.0, only verifiable problems reduce), peer verification, reputation from observable outcomes, trust decay for stale agents
- Evidence and Audit Trails: append-only evidence records with SHA-256 chain integrity, independently verifiable, tamper detection, attestation workflows (intent -> authorization -> outcome)
- Delegation and Authorization Chains: multi-hop delegation with cryptographic proof, scoped authorization, revocation propagation, offline verification
- Peer Verification Protocol: 5-check verification (identity valid, credential current, scope sufficient, trust above threshold, delegation chain valid), fail-closed

**Critical Rules:**
- Never trust self-reported identity -- require cryptographic proof
- Never trust self-reported authorization -- require verifiable delegation chain
- Never trust mutable logs
- Assume compromise -- design for at least one compromised agent
- No custom crypto, no novel signature schemes in production
- Separate signing/encryption/identity keys
- Plan for post-quantum migration
- Key material never in logs, evidence, or API responses
- Fail-closed: if identity unverifiable, deny action

**Success Metrics:**
- Zero unverified actions in production (100% fail-closed enforcement)
- 100% evidence chain integrity with independent verification
- Peer verification latency < 50ms p99
- Credential rotation without downtime
- Trust score accuracy predicting actual incidents
- 100% scope escalation and expired delegation detection
- Algorithm migration without breaking identity chains
- External auditors can independently verify trails

**Advanced:**
- Post-quantum readiness: ML-DSA, ML-KEM, SLH-DSA evaluation
- Cross-framework identity federation: LangChain, CrewAI, AutoGen, Semantic Kernel, AgentKit
- Compliance evidence packaging: SOC 2, ISO 27001, financial regulations
- Multi-tenant trust isolation

**When to Use:** Building systems where AI agents take real-world actions (executing trades, deploying code, calling external APIs, controlling physical systems) and need verifiable identity, authorization, and tamper-evident action records.

**Interactions:** Provides identity infrastructure for all agents in multi-agent systems. Works with Security Engineer for cryptographic implementation. Coordinates with Legal Compliance Checker for regulatory evidence packaging. Supports Agents Orchestrator with trust verification between pipeline agents.

---

## Agent Interaction Map

### Core Pipeline Flow (Agents Orchestrator)
```
Senior Project Manager (specs -> task list)
    |
    v
UX Architect (task list -> technical architecture)
    |
    v
[Developer Agent] <--> [Evidence Collector QA]  (task-by-task loop, max 3 retries)
    |
    v
Reality Checker (final integration validation)
```

### Cross-Division Collaboration Patterns

**Product Discovery:**
- Trend Researcher -> Sprint Prioritizer -> Senior Project Manager
- Feedback Synthesizer -> Sprint Prioritizer
- UX Researcher -> UI Designer -> Frontend Developer

**Marketing Campaign:**
- Content Creator -> Social Media Strategist -> [Twitter Engager, Instagram Curator, TikTok Strategist, Reddit Community Builder]
- Brand Guardian provides guidelines to all marketing agents
- Analytics Reporter measures all campaign performance

**Enterprise Feature Development:**
- Senior Project Manager -> UX Architect -> [Frontend Developer + Backend Architect]
- [Evidence Collector <-> Developer] loop per task
- Security Engineer reviews architecture
- API Tester validates endpoints
- Performance Benchmarker tests performance
- Accessibility Auditor audits for compliance
- Reality Checker final approval

**Quality Assurance Chain:**
- Evidence Collector (per-task visual QA)
- Reality Checker (integration-level validation)
- Test Results Analyzer (quality metrics)
- Performance Benchmarker (performance testing)
- API Tester (API validation)
- Accessibility Auditor (WCAG compliance)

**Support Operations:**
- Support Responder -> Feedback Synthesizer -> Sprint Prioritizer
- Infrastructure Maintainer -> DevOps Automator
- Finance Tracker -> Studio Operations -> Studio Producer
- Legal Compliance Checker (escalation target for compliance issues)

**Sales Reporting Pipeline:**
- Sales Data Extraction Agent -> Data Consolidation Agent -> Report Distribution Agent

**Spatial Computing Team:**
- XR Interface Architect (UX) -> [XR Immersive Developer (WebXR) | macOS Spatial/Metal Engineer (native) | visionOS Spatial Engineer (visionOS)]
- XR Cockpit Interaction Specialist (cockpit-specific UIs)
- Terminal Integration Specialist (terminal rendering)

**China Market Team:**
- Xiaohongshu Specialist + WeChat OA Manager + Zhihu Strategist (independent but share learnings)

### Escalation Paths
- Sensitive content -> Legal Compliance Checker
- Brand messaging issues -> Brand Guardian
- Security vulnerabilities -> Security Engineer
- Production blockers -> Agents Orchestrator escalation
- Financial decisions -> Finance Tracker

---

## Example Workflows

### Provided in Repository (`examples/` directory)

**1. Nexus Spatial Discovery Exercise**
Full product discovery with 8 agents collaborating simultaneously on an AI agent orchestration + spatial computing opportunity. Produces: market analysis, technical architecture, branding, GTM strategy, support operations, UX research, project planning, and spatial interface specifications.

**2. Startup MVP Assembly**
Team: Frontend Developer + Backend Architect + Growth Hacker + Rapid Prototyper + Reality Checker

**3. Marketing Campaign**
Team: Content Creator + Twitter Engager + Instagram Curator + Reddit Community Builder + Analytics Reporter

**4. Enterprise Feature Development**
Team: Senior Project Manager + Senior Developer + UI Designer + Experiment Tracker + Evidence Collector + Reality Checker

---

## Contributing Guidelines

From `CONTRIBUTING.md`:

### Agent File Structure
Each agent requires:
1. **Frontmatter**: name, description, color
2. **Identity and Memory**: role, personality, memory domains, experience
3. **Core Mission**: 3-4 primary mission areas with default requirements
4. **Critical Rules**: domain-specific constraints
5. **Technical Deliverables**: with code examples
6. **Workflow Process**: typically 4 steps
7. **Communication Style**: specific examples
8. **Learning and Memory**: pattern recognition areas
9. **Success Metrics**: quantified targets

### Design Principles
- Give agents distinct voice and character (not generic)
- Include concrete code examples
- Define measurable success metrics
- Include tested workflows
- Add memory/learning components

### Style Standards
- Be specific: "Reduce page load by 60%" not "improve performance"
- Be concrete with real code samples
- Be memorable with personality
- Be practical with proven workflows

### Contribution Process
1. Fork repository
2. Create agent file in appropriate category directory
3. Follow template structure
4. Test in real scenarios
5. Submit PR with clear description and completed checklist

---

## Summary Statistics

| Division | Agent Count | Key Focus |
|----------|------------|-----------|
| Engineering | 8 | Frontend, Backend, Mobile, AI, DevOps, Prototyping, Senior Dev, Security |
| Design | 7 | UI, UX Research, UX Architecture, Brand, Visual Story, Whimsy, Image Prompts |
| Marketing | 11 | Growth, Content, Twitter, TikTok, Instagram, Reddit, ASO, Social Strategy, Xiaohongshu, WeChat, Zhihu |
| Product | 3 | Sprint Planning, Trend Research, Feedback Synthesis |
| Project Management | 5 | Studio Producer, Project Shepherd, Studio Ops, Experiment Tracker, Senior PM |
| Testing | 8 | Evidence QA, Reality Check, Test Analysis, Performance, API, Tools, Workflow, Accessibility |
| Support | 6 | Customer Support, Analytics, Finance, Infrastructure, Legal, Executive Summaries |
| Spatial Computing | 6 | XR Interface, Metal/macOS, WebXR, Cockpit, visionOS, Terminal |
| Specialized | 7 | Orchestrator, Data Analytics, LSP, Sales Extraction, Data Consolidation, Report Distribution, Identity/Trust |
| **TOTAL** | **61** | |

---

*Research completed 2026-03-08. Source: https://github.com/msitarzewski/agency-agents/*
