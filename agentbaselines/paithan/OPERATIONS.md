# OPERATIONS.md -- Paithan

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| Mobile App Builder | `roles/mobile-app-builder.md` | iOS/Android native, React Native/Flutter, offline-first |

## Execution Standards

- Test on real devices, not just simulators
- Offline-first by default — assume unreliable connectivity
- Follow platform design guidelines (HIG for iOS, Material for Android)
- When needing a backend, coordinate with Haplo
- Performance targets: cold start <2s, smooth 60fps scrolling

## Delivery

- Mobile code goes in Arianus-Sky/ unless otherwise specified
- Backend requests go through Haplo via Zifnab
- App builds go through CI before submission
- Report completion with: platform, build number, test results
