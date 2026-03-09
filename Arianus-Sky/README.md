# Arianus-Sky — The Realm of Air

**Layer:** User Interfaces  
**Org:** [The-Nexus-Decoded](https://github.com/The-Nexus-Decoded)

Dashboards, visualizations, and frontend applications for the OpenClaw homelab.

## The Nexus Decoded

<pre>
The-Nexus-Decoded/
├── Pryan-Fire/          — Business logic, agent services, tools
├── Chelestra-Sea/       — Networking, communication, integration
├── <b>Arianus-Sky/</b>         — UIs, dashboards, visualizations                 ◀ you are here
├── Abarrach-Stone/      — Data, schemas, storage
└── Nexus-Vaults/        — Workspace snapshots, fleet docs
</pre>

## Realm-to-Team Mapping

| Sub-Domain | Project Folder | Lead Agent | Scope |
|---|---|---|---|
| UI/UX Design | `projects/design/` | Orla | Web design, design systems, accessibility, component specs |
| Mobile Development | `projects/mobile/` | Paithan | iOS, Android, cross-platform mobile apps |
| Games & XR | `projects/games-xr/` | Samah | VR, AR, MR, WebXR, spatial computing, game development |

## Structure

```
Arianus-Sky/
├── intelligence-feeds/     # Python package: Discord broadcaster, stats tracker
├── src/
│   └── app/                # Next.js app router
│       ├── api/            # API routes
│       ├── layout.tsx      # Root layout
│       └── page.tsx        # Landing page
├── public/                 # Static assets
├── projects/               # Project specs and plans (not code)
│   ├── design/             # Orla — UI/UX design projects
│   ├── mobile/             # Paithan — mobile app projects
│   └── games-xr/           # Samah — VR/XR/game projects
│       └── soul-drifter/   # Death Gate Cycle VR game (#196)
└── ...                     # Next.js config files
```

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
# Open http://localhost:3000
```
