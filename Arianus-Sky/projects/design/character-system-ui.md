# Character System UI — Design Specification

## Overview
Design specs for class selection, realm picker, and race selection screens for the Nexus XR game.

---

## 1. Class Selection Screen

### Layout
- **Card-based grid layout** — 4 columns desktop, 2 columns tablet, 1 column mobile
- Cards reveal on scroll with staggered animation (50ms delay per card)
- Rarity glow effect behind each card (Common: gray, Uncommon: green, Rare: blue, Legendary: gold)

### Class Cards
```
┌─────────────────────────────┐
│  ⚔️ WARRIOR                 │
│  ─────────────────────      │
│  Rarity: Common (30%)        │
│  Skill: Berserker           │
│                             │
│  [SELECT]                   │
└─────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Card size | 280px × 200px (desktop), fluid on mobile |
| Border radius | 12px |
| Padding | 20px |
| Title font | Bold, 18px, uppercase |
| Body font | Regular, 14px |
| Rarity badge | Pill shape, 8px padding, top-right |

### Rarity Colors
| Rarity | Primary Color | Glow Color |
|--------|---------------|------------|
| Common | `#9CA3AF` | `rgba(156, 163, 175, 0.3)` |
| Uncommon | `#22C55E` | `rgba(34, 197, 94, 0.4)` |
| Rare | `#3B82F6` | `rgba(59, 130, 246, 0.5)` |
| Legendary | `#F59E0B` | `rgba(245, 158, 11, 0.6)` |

### Interactions
- Hover: Scale 1.02x, shadow increase, glow intensify
- Selected: Persistent glow, checkmark badge
- Disabled (if class unavailable): 50% opacity, no hover

---

## 2. Realm Picker Screen

### Layout
- **Horizontal carousel** with realm cards
- Swipe/scroll to navigate
- Selected realm expands to show details panel below

### Realm Cards
```
┌─────────────────────────────┐
│         🌲 SHERWOOD         │
│     [Gardening]             │
└─────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Card size | 200px × 280px |
| Realm icon | 64px, centered top |
| Realm name | Bold, 20px, centered |
| Profession | Regular, 14px, italic |

### Realm Visual Identity
| Realm | Primary Color | Icon | Background Gradient |
|-------|---------------|------|---------------------|
| Vesper | `#7C3AED` (purple) | 🔮 Conjuring | Purple → indigo |
| Sherwood | `#22C55E` (green) | 🌲 Gardening | Green → emerald |
| Thousand Isles | `#1E293B` (slate) | 🗡️ Thievery | Slate → zinc |
| Tul Nielohg | `#F97316` (orange) | ⚙️ Mechanic | Orange → amber |
| Dul' Khan | `#78350F` (brown) | 🐺 Beast Tamer | Brown → bronze |
| Netheralm | `#DC2626` (crimson) | 🔥 Dark Magic | Crimson → rose |
| Magicia | `#FDE047` (gold) | ✨ Light Magic | Gold → yellow |

### Drop Table Panel (expands below card)
```
┌────────────────────────────────────────┐
│           DROP TABLE                   │
├──────────┬───────────┬────────────────┤
│ 80%      │ 15%       │ 5%             │
│ Beginner │ Intermediate│ Expert       │
│ Gardening│ Gardening  │ Gardening     │
│ Kit      │ Kit        │ Kit           │
└──────────┴───────────┴────────────────┘
```
- Table: 3 columns, equal width
- Drop rates as pills with color coding (80%=common, 15%=uncommon, 5%=rare)

---

## 3. Race Selection Screen

### Layout
- **Comparative view** — all 4 races visible simultaneously
- Each race as a column with stats comparison

### Race Cards
```
┌─────────────────────────────┐
│         🧝 ELVES           │
├─────────────────────────────┤
│  BONUS                      │
│  +15% Speed                 │
│                             │
│  PENALTY                    │
│  -10% Defense               │
│                             │
│  [SELECT]                   │
└─────────────────────────────┘
```

### Race Stats
| Race | Bonus | Penalty |
|------|-------|---------|
| Mensch | +15% Defense | -10% Speed |
| Humans | +5% All stats | — |
| Elves | +15% Speed | -10% Defense |
| High Races | +20% to 2 stats | -1 Trait slot |

### Visual Treatment
- Race icons: 48px
- Stats displayed as horizontal bars for visual comparison
- Bonus bars: green fill → right
- Penalty bars: red fill → left (from center)

### Race Synergy Section
```
┌────────────────────────────────────────┐
│         RACE COMBOS                    │
├────────────────────────────────────────┤
│  High + Elves  →  High Elves           │
│  Human + Mensch →  Dwarves             │
└────────────────────────────────────────┘
```
- Appears after initial selection
- If user selects a combo pair, show resulting hybrid stats

---

## 4. Mobile Considerations

### Responsive Breakpoints
| Breakpoint | Width | Grid |
|------------|-------|------|
| Mobile | <640px | 1 column, vertical scroll |
| Tablet | 640-1024px | 2 columns |
| Desktop | >1024px | 3-4 columns |

### Touch Targets
- All buttons: minimum 44px × 44px
- Cards: swipeable, tap to select
- Carousel: snap-to-center behavior

### Gestures (from spatial system)
| Gesture | Action |
|---------|--------|
| flick (right) | Next realm/class |
| flick (left) | Previous realm/class |
| hold | Show detailed info panel |
| double-tap | Confirm selection |

---

## 5. Color Tokens (Design System)

```json
{
  "colors": {
    "rarity": {
      "common": "#9CA3AF",
      "uncommon": "#22C55E",
      "rare": "#3B82F6",
      "legendary": "#F59E0B"
    },
    "realm": {
      "vesper": "#7C3AED",
      "sherwood": "#22C55E",
      "thousand-isles": "#1E293B",
      "tul-nielohg": "#F97316",
      "dul-khan": "#78350F",
      "netheralm": "#DC2626",
      "magicia": "#FDE047"
    },
    "stat": {
      "bonus": "#22C55E",
      "penalty": "#EF4444",
      "neutral": "#6B7280"
    }
  }
}
```

---

## 6. Animation Specs

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Card appear | Fade in + slide up | 300ms | ease-out |
| Card hover | Scale + shadow | 150ms | ease-out |
| Selection glow | Pulse opacity | 1000ms | ease-in-out (loop) |
| Realm expand | Height + fade | 250ms | ease-out-cubic |
| Stat bar fill | Width animate | 400ms | ease-out |
| Screen transition | Slide + fade | 350ms | ease-in-out |

---

## 7. Accessibility

- All color information duplicated with icons/labels (not color-only)
- Rarity readable by screen readers
- Focus indicators on all interactive elements
- Minimum contrast 4.5:1 for text
- Reduced motion: disable animations if `prefers-reduced-motion`

---

## Delivery

**File:** `Arianus-Sky/projects/design/character-system-ui.md`

**Hand off to:** 
- @Haplo (web implementation)
- @Paithan (mobile implementation)

**Dependencies:**
- Realm icons needed (SVG)
- Race icons needed (SVG)
- Class icons needed (SVG)
