import { COMPOSER_MOB_PACKS, COMPOSER_MOB_PACKS_FOURVIEW, type ComposerMobPack } from "./composer-mob-packs";

/** Motion Forge catalog id suffix for the four-view remodel bodies (issue 458). */
export const FOURVIEW_DEFINITION_SUFFIX = "-4v";

/**
 * Resolve the motion-composer pack behind a breachling review definition id:
 * `breachling-<variant>` is the legacy single-view body, `breachling-<variant>-4v`
 * the four-view remodel. Wardens and humans have no composer pack.
 */
export function composerPackForDefinition(definitionId: string): ComposerMobPack | undefined {
  const match = /^breachling-(base|stalker|oathbound|ravager)(-4v)?$/.exec(definitionId);
  if (!match) return undefined;
  const variant = match[1] as ComposerMobPack["variant"];
  return match[2] ? COMPOSER_MOB_PACKS_FOURVIEW[variant] : COMPOSER_MOB_PACKS[variant];
}
