# SoulDrifter Test Avatar and Real-Mesh Presentation Policy

Version: 2026-09-04 / test-avatar-v1
Implementation owner: #512
Program: #501; consumers #509, #510, #495 and #459
Status: required implementation contract; not a completed runtime feature

## Owner requirement

Remove fake pill/capsule-shaped visible actor stand-ins. In testing, the owner can select any available usable 3D asset as the controlled avatar, including player-character assemblies, NPCs, monsters, bosses, animals and other loadable models. This is a model selector in the running level, not just an asset-gallery turntable.

## Checkpoint precedence

PR #511 preserves the original outdoors exactly, including its current defects and placeholders. Capture source and local assets, verify a backup restore, reconcile/test the QA baseline and keep the original and integrated checkpoints separate. Do not remove pills or add the picker before the original snapshot is secured; do not make this new feature a prerequisite for completing the backup.

Implement #512 as a separate post-checkpoint change on the verified baseline. Neither frozen tag nor source snapshot is repointed. Checkpoint-only agents record/handoff this work; they do not expand #511 into a redesign PR.

## No-pill presentation

In the new pilot's normal review view:

- the test player, quest NPCs and populated creatures use actual meshes, not rendered capsule/dummy bodies;
- rejected oversized opaque pill nameplates are replaced with unobtrusive readable focus/selection/proximity information, including touch/keyboard access;
- required quest targets and interactions are not removed or made invisible just to satisfy a screenshot;
- collision proxies remain functional but invisible; an explicit labeled developer collision overlay may reveal them, off by default;
- a model load failure preserves the last valid avatar or reports an asset-not-ready blocker, never silently substitutes a pill.

The no-pill gate applies to the new presentation, not archived before-images or the untouched rollback source.

## Selector contract

A visible, keyboard/touch-accessible `Test Avatar` control lists the existing controlled asset registry and discovered local exports. No hard-coded Human-only list and no code/URL edits for each selection.

Entries expose stable asset ID, category, name, source version/full hash, dimensions, availability and separate geometry/material/rig/animation status. Thumbnail/preview and filters should make a large registry usable. New exports can be registered/refreshed without rewriting selector code. Missing/malformed/rejected/quarantined entries explain why they cannot enter the test; they are not silently promoted.

Selecting an asset safely creates a test instance, attaches it to the existing player controller and follows it with the gameplay camera. It does not steal a live quest NPC from the world. Provide `Restore normal avatar`. All applicable movement, interaction and quest testing uses the same runtime systems, not a disconnected model viewer.

## Test appearance is not story identity

Keep player/entity ID, class, inventory, XP, quest instances and event attribution stable. A monster appearance does not grant monster skills, flight, noclip, faction membership or access rights.

Heartvale's authored social population remains Human-only. The debug avatar may look non-Human without adding a non-Human resident or changing player ancestry eligibility. The Human-only NPC validation profile must not filter the developer model picker.

Use isolated test saves/session metadata. Never persist this override into normal character profiles or world-population canon. Remove the override and restore the original model/equipment presentation on exit. Unsupported equipment sockets hide that attachment only in the temporary view; they do not delete inventory items.

## Unanimated meshes are usable

A good mesh without a rig or animation remains selectable and can move/rotate for scale, placement, collision and camera inspection. Label it `MESH_ONLY / ANIMATION_UNAVAILABLE`. Rigid movement in this explicit debug mode is permitted; it is not an accepted walk animation or production behavior proof.

Only use clips validated for the chosen rig. Do not apply Human animation indiscriminately to animals/bosses. Where present, expose appropriate clip previews and humanoid T/A-pose inspection; report unsupported actions rather than blocking all mesh selection. Keep #456 active; no batch regeneration or paid animation is required merely to enable testing.

## Geometry, camera and collision

Use authored dimensions/origin/ground contact, not silent Human-size normalization. Select an asset-appropriate collision/movement profile or explicitly provisional derived proxy; record it. Refit the camera to the model and preserve obstacle avoidance.

Validate the new bounds at the current location before a swap. An unsafe fit retains the old model and reports the obstruction or offers an explicit safe test position; no silent wall teleport, shrinking or noclip. A separate standard-player-collider comparison mode, if provided, is labeled VISUAL_ONLY and does not count as species-sized traversal proof.

## Runtime safety

Load before swapping. Latest selection wins; cancel/discard stale asynchronous results. Clean up owned instances, colliders, mixers and subscriptions without disposing shared assets in use by other actors. Repeated swaps must not leak resources, duplicate actors/events/rewards or reset the quest session.

Use controlled manifests/loaders. Do not fetch arbitrary executable content, fire generation jobs or spend credits from a selection. Exclude or genuinely capability-gate the picker in public production; a URL flag alone is not permission to access debug authority.

## Acceptance receipt

#512 requires fresh desktop and phone-width evidence of player/NPC/monster/animal selection, one unanimated mesh selection, in-level movement and interaction, and restoration of the normal avatar. Missing categories remain explicitly unpassed.

Test small/Human/large bounds against roads, doors, slopes, bridges/banks and props; keep physics overlays separate from normal screenshots. Test failed loading, rapid repeated selection, reload, save isolation and one-time quest rewards. Record asset/hash, scale, camera/collision profile, clip availability, limitations and route result.

New pilot scenes must contain real visible actors with no pill stand-ins or giant opaque labels. Independent review precedes owner-ready status. No claim of production animation, universal locomotion or a completed quest framework follows merely from successful mesh swapping.

## New-agent addendum

After completing PR #511 checkpoint obligations, work on #512 in its own branch/worktree under #501. Read this policy and the live issue/comments. Audit existing selectors/controllers and reuse valid components. Coordinate shared preview/registry files with #509/#510/#495. Implement locally after the bounded catch-up; do not stop at another spec. No merge, deploy, source reset or provider spending is authorized by this policy.
