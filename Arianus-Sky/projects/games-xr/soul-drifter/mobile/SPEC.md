# Soul Drifter - Mobile Companion

## Project Overview
- **Project Name:** Soul Drifter Mobile
- **Type:** Cross-platform mobile companion app (iOS/Android)
- **Core Functionality:** Touch-based control interface for VR experience, IntentPipe bridge for XR integration
- **Target Users:** VR headset owners who want mobile companion controls

## Technical Stack
- **Framework:** React Native with Expo
- **Language:** TypeScript
- **State Management:** Zustand
- **Navigation:** React Navigation

## Directory Structure
```
soul-drifter/mobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/       # App screens
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API/IntentPipe services
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript types
├── assets/            # Images, fonts
├── ios/               # iOS native code
├── android/           # Android native code
└── __tests__/         # Test files
```

## IntentPipe Integration
Mobile publishes touch intents to IntentPipe:
- TouchStart, TouchMove, TouchEnd events
- Gesture classification (tap, swipe, pinch, drag)
- Action payloads for XR consumption

## Current Status
Scaffold created - pending IntentPipe service implementation.
