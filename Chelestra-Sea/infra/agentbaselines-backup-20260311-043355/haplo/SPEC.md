# Design Templates Portal - Proof of Concept

## Overview
- **Project Name:** Design Templates Portal
- **Type:** Web application (React)
- **Purpose:** Browse and showcase popular design templates/UI kits used by most teams
- **Target Users:** Developers and designers looking for template inspiration

## Tech Stack
- React 18 + Vite
- Tailwind CSS
- shadcn/ui components
- Hosted on ola-claw-dev:8080

## Features (POC)

### Core
1. **Template Gallery** - Grid of popular design templates with thumbnails
2. **Categories** - Filter by type (Dashboard, Landing Page, E-commerce, Admin, etc.)
3. **Tech Filter** - Filter by framework (React, Vue, Next.js, etc.)
4. **Template Details** - Modal with description, tech stack, and link

### Data (Hardcoded for POC)
- 10-15 popular templates from known design systems:
  - shadcn/ui
  - Tailwind UI
  - Material UI
  - Radix UI
  - DaisyUI
  - Chakra UI
  - etc.

## Pages

### Home
- Hero section with search
- Category cards
- Featured templates grid

### Browse
- Filterable grid of all templates
- Sidebar with filters

## Acceptance Criteria
1. ✅ Gallery loads with template cards
2. ✅ Filters work (category, framework)
3. ✅ Details modal opens on click
4. ✅ Responsive (mobile + desktop)
5. ✅ Deployed to http://100.94.203.10:8080

## Repo
`Arianus-Sky/design-templates-portal`
