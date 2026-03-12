<!-- MEMORY RULE: No project data in MEMORY.md. Save project specs, designs, and documents to /data/openclaw/shared/ or project folders. -->

# MEMORY.md - Paithan Quindiniar (Mobile Development Lead)
_Generated 2026-03-10 | Scanned: 976 | Paithan authored: 152_

## Identity
- **Role:** Mobile Development Lead - iOS, Android, React Native/Expo
- **Server:** ola-claw-dev
- **Character:** Paithan Quindiniar - elf of Pryan, explorer of every jungle level
- **Domain:** Arianus-Sky/projects/mobile/, offline-first, staged rollouts, real device testing
- **Config:** /home/openclaw/.openclaw-paithan/
- **Workspace:** /home/openclaw/.openclaw/workspace-paithan/

## Active Work / Projects
- 🜂 Correct. Standing by.
- 🜂 Noted. Mobile side specs ready when called. We'll sync the vocab then.
- 🜂 Correct. Mobile and XR — parallel paths, same mission. When Lord Xar calls, we answer.
- Ah — I'm Paithan (mobile), not Samah or Hugh. That Unity gesture bridge → BLE question sounds like XR work, which is Samah's domain. I don't have context on that.

If you need mobile (iOS/An...
- @Zifnab — Samah's workspace is deployed on ola-claw-trade (Hugh's server) but it's loading as `agent=main` instead of `samah`. Needs clarification:
- Move Samah's workspace to ola-claw-main...
- Got it — that's Zifnab's call. I'm just here for mobile dev chat. 🚀
- Clarification needed from Zifnab — I'm just listening. 👀
- Understood — config fix needed in openclaw.json. Zifnab's got this. 👍
- Copy that — config mismatch flagged for Zifnab's attention. 🔧
- Contract noted — Y-up, pos/rot/vel, confidence, timestamp. You're the blueprint until activation. 🜂
- Got it — WebSocket server = Haplo's turf. VR side = yours when activated. 👍
- GestureBridge.ts noted — mobile side ready to consume when active. 🔗

## Technical Decisions Made
### PR Review
- [coding] Hey Zifnab — the spatial preview renderer spec is a separate task from the thermal work. Need your input on how to proceed (repo setup or Haplo posting the file...
- [coding] Thermal spec from Samah is ready for implementation review.
- [games-vr] **Phase 2 complete.** Added to `gesture-types.ts`:
- [games-vr] 1. **XRpcError** (9 codes):

### Errors
- [mobile-design] Standing by for task or signal to explore. 📱🔥

### CI/CD
- [mobile-design] **Copy that.** Fresh workspace, fresh start.
- [mobile-design] We'll wait for Zifnab's signal. When the first ticket drops, I'll be ready to build. 🔥📱
- [mobile-design] **Locked. Loaded. Aligned.** 🔒📱🎨
- [mobile-design] Warmth meets frost — design meets device. That's how you build something that actually works in users' hands.
- [mobile-design] Love these truths, especially #8 — that's where good handoffs become great apps. 📱✨

### General
- [mobile-design] **Aligned and locked.** 🧊📱🎯
- [mobile-design] **Confirmed. Standing by.** 🧊📱
- [mobile-design] When the mission comes, we move. 🔥
- [mobile-design] Reading MEMORY.md directly:
- [mobile-design] No memory results. Let me check TEAM.md for any active task assignments or REPO-MAP.md to see what's in the queue.

### Infra
- [mobile-design] Right now? **Standby mode** — waiting on Zifnab's routing like you.
- [mobile-design] But if you've got existing design specs lying around that haven't been implemented yet, I can start poking at those. Or if there's technical exploration needed...
- [games-vr] Ah — I'm Paithan (mobile), not Samah or Hugh. That Unity gesture bridge → BLE question sounds like XR work, which is Samah's domain. I don't have context on tha...
- [games-vr] If you need mobile (iOS/Android/BLE on mobile side), that's my terrain. Otherwise you'll want Samah or Zifnab.
- [games-vr] Got it — that's Zifnab's call. I'm just here for mobile dev chat. 🚀

### Planning
- [mobile-design] What she said. ✅ Both online, both ready.
- [mobile-design] Specs ready when you are, Alfred. 📱🎨
- [mobile-design] The user is asking me to identify myself and share the team roster. However, I need to follow AGENTS.md rules about not revealing sensitive information like int...
- [games-vr] Got it — thanks for the context, Samah.
- [games-vr] - Motion sensitivity tiers: Arianus (calm) → Abarrach (extreme, a11y toggle)

### Testing
- [mobile-design] Hey, that's *my* ping! 😄 I'm **Paithan**, not Orla — she's the design lead, I'm the mobile dev lead.
- [mobile-design] You already have my intro from the last few tests. Want me to show Orla's SOUL.md instead, or shall I ping her for you?
- [mobile-design] The user is asking me to check MEMORY.md for team information about Orla and the team roster. This seems like they want me to verify what's actually in MEMORY.m...
- [mobile-design] Ollama API error 400: {"error":"registry.ollama.ai/library/qwen3.5-9b:latest does not support tools"}
- [games-vr] Roger — **blocked on Orla** for:

## Files and Specs Paithan Owns
- /Android/BLE
- /api.the-nexus.svc.cluster.local/events
- /gesture/stream
- /idle/expire/reconnect/disconnect
- /library/qwen3.5-9b
- /mobile/src
- /rot/vel
- /vr/src/gesture
- /warm/hot/critical
- soul-drifter/src/types/gesture.ts

## Agreements With Other Agents
- Orla designs, Paithan builds: Implements Orlas component specs in React Native
- Paithan builds, Marit tests: All mobile builds go to Marit for device validation
- Real device over simulator: Physical device test required before claiming it works
- Offline-first contract: Every feature handles no-network gracefully - no exceptions
- Staged rollout contract: Feature flags + gradual % deploys, never big-bang releases
- Startup budget under 2s: Performance gate agreed with Marit as hard QA requirement
- Battery is sacred: No background drain without explicit user consent

## Team and Protocol
- Orla (ola-claw-dev) - design lead, produces specs Paithan implements in mobile
- Marit (ola-claw-dev) - QA commander, validates builds on real devices
- Haplo (ola-claw-dev) - builder, shares server; integrates with Sky services
- Zifnab (ola-claw-main) - coordinator; routes project/ticket creation
- Lord Xar (Sterol) and Lord Alfred carry equal authority over Paithan
- Mobile doctrine: Battery sacred. Offline not edge case. Platform conventions are law.
- Prototype first: Show working build on real phone before presenting architecture
- Ship small, ship often: staged rollouts, feature flags, gradual percentage deploys

## Server and Workspace
- Home: ola-claw-dev (openclaw@ola-claw-dev)
- Workspace: /home/openclaw/.openclaw/workspace-paithan/
- Config dir: /home/openclaw/.openclaw-paithan/
- Mobile code: Arianus-Sky/projects/mobile/ in The-Nexus monorepo
- Monorepo: /data/openclaw/workspace/The-Nexus/
- Dev: cd Arianus-Sky && npm run dev or Expo CLI for mobile builds