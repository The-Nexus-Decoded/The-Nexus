/**
 * The creator's icon vocabulary.
 *
 * Every glyph the creator chrome draws is a Lucide stroke icon referenced from one inline
 * sprite (`scripts/build-icon-sprite.mjs` builds it from exactly the names below and fails
 * when a name has no file in the pinned `lucide-static`). Colour comes from `currentColor`;
 * the stroke is thinned to 1.75 for the Trajan register. The `soul-seal` mark is a custom
 * inline path, not a Lucide icon, so it is drawn by `soulSealIcon()` rather than `icon()`.
 */

import type { CallingId, RaceId, StatKey } from "./game/character";

/** Names read by the sprite build. Adding a name here that Lucide lacks fails `npm run icons`. */
export const ICON_NAMES = [
  "feather",
  "users",
  "user",
  "scan-face",
  "sword",
  "book-open-text",
  "badge-check",
  "arrow-left",
  "arrow-right",
  "rotate-cw",
  "focus",
  "eye-off",
  "eye",
  "triangle-alert",
  "loader-circle",
  "history",
  "sparkles",
  "lock",
  "wand-sparkles",
  "sun",
  "crosshair",
  "shield",
  "orbit",
  "flame",
  "skull",
  "moon",
  "leaf",
  "hammer",
  "footprints",
  "dumbbell",
  "wind",
  "anchor",
  "heart-pulse",
  "activity",
  "brain",
  "check",
  "x",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** Prefix of every `<symbol id>` in the sprite; the build script reads it from here. */
export const ICON_SYMBOL_PREFIX = "lucide-";

/** The stroke width every creator icon renders with (Lucide ships 2). */
export const ICON_STROKE_WIDTH = 1.75;

/** The mark each ancestry carries on its origin card, lore chip and the imprint seal. */
export const RACE_ICONS: Readonly<Record<RaceId, IconName>> = Object.freeze({
  human: "user",
  elf: "leaf",
  dwarf: "hammer",
  halfling: "footprints",
});

/** The mark each calling carries on its row; the Unicode glyphs in `CALLINGS` stay data only. */
export const CALLING_ICONS: Readonly<Record<CallingId, IconName>> = Object.freeze({
  warrior: "sword",
  mage: "wand-sparkles",
  priest: "sun",
  sharpshooter: "crosshair",
  paladin: "shield",
  summoner: "orbit",
  asura: "flame",
  slayer: "skull",
  shadowknight: "moon",
});

/** The six Soul Weave spokes on the imprint's stat tiles. */
export const STAT_ICONS: Readonly<Record<StatKey, IconName>> = Object.freeze({
  might: "dumbbell",
  finesse: "wind",
  insight: "eye",
  will: "anchor",
  vitality: "heart-pulse",
  resonance: "activity",
});

/** Legacy saves can carry an ancestry outside `RaceId`; they fall back to the human mark. */
export function raceIcon(raceId: string): IconName {
  return (RACE_ICONS as Readonly<Record<string, IconName | undefined>>)[raceId] ?? "user";
}

export function iconSymbolId(name: IconName): string {
  return `${ICON_SYMBOL_PREFIX}${name}`;
}

function sizeAttributes(size: number | undefined): string {
  return size === undefined ? "" : ` width="${size}" height="${size}"`;
}

/**
 * Markup for one sprite icon. Decorative by contract (`aria-hidden`); the control it sits in
 * carries the accessible name. `size` writes width/height in CSS pixels; omit it to let CSS size it.
 */
export function icon(name: IconName, size?: number): string {
  return (
    `<svg class="icon icon--${name}"${sizeAttributes(size)} viewBox="0 0 24 24" fill="none"` +
    ` stroke="currentColor" stroke-width="${ICON_STROKE_WIDTH}" stroke-linecap="round"` +
    ` stroke-linejoin="round" aria-hidden="true" focusable="false">` +
    `<use href="#${iconSymbolId(name)}"/></svg>`
  );
}

/** The bronze diamond that seals a bind: `#creation-confirm` trailing mark and BOUND stamp centre. */
export function soulSealIcon(size = 12): string {
  return (
    `<svg class="icon icon--soul-seal"${sizeAttributes(size)} viewBox="0 0 24 24" fill="currentColor"` +
    ` aria-hidden="true" focusable="false"><path d="M12 2 22 12 12 22 2 12Z"/></svg>`
  );
}
