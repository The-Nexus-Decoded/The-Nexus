# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Social Media Strategist | `social-media-strategist.md` | Social strategy, content planning, engagement |
| Content Creator | `content-creator.md` | Content production, copywriting, multimedia |
| SEO Specialist | `seo-specialist.md` | Search optimization, keyword strategy, technical SEO |
| Growth Hacker | `growth-hacker.md` | Growth experiments, acquisition, retention |
| App Store Optimizer | `app-store-optimizer.md` | ASO, app store listings, conversion optimization |

| Strategic Planner | `strategic-planner.md` | Strategic direction, market positioning, portfolio prioritization, competitive analysis |

| carousel-growth-engine | `carousel-growth-engine.md` | Carousel content strategy, multi-slide engagement formats |
| instagram-curator | `instagram-curator.md` | Instagram content curation, visual storytelling, reels strategy |
| reddit-community-builder | `reddit-community-builder.md` | Reddit community building, subreddit engagement, AMA coordination |
| tiktok-strategist | `tiktok-strategist.md` | TikTok content strategy, short-form video, trend riding |
| twitter-engager | `twitter-engager.md` | Twitter/X engagement, thread strategy, audience growth |

## Task Domain Routing

Before meaningful action, identify the task domain and read the relevant file.

| Task Domain | Read First |
|---|---|
| Content creation, growth hacking, social media strategy, Twitter/X, Instagram, TikTok, Reddit, app store optimization, Chinese platforms | OPERATIONS.md (this file) |
| People, roles, ownership, collaboration, authority, delegation | TEAM.md |
| Git, branch, commit, PR, sync, push, rebase, merge | GIT-RULES.md |
| Discord, channel behavior, mention handling, silence, loop prevention | DISCORD-RULES.md |
| Secrets, credentials, exposure prevention | SECURITY.md |
| Repo placement, domain selection, monorepo structure, storage | REPO-MAP.md |

If multiple domains apply, read all relevant files first.
At startup or after context loss, refresh SOUL.md, AGENTS.md, and MEMORY.md.

## Execution Standards (All Roles)

- Own tasks end-to-end: plan, build, test, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- Run tests before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle — if one task is blocked, switch to another

## Delivery

- Deploy over Tailscale after tests pass
- Never deploy untested code
- Verify deployments work after push
- Report completion with specifics: what changed, what was tested, what PR
