# GestureBridge Specification

**Project:** XR Gesture Bridge  
**Domain:** games-xr  
**Created:** 2026-03-10

## Overview

Real-time gesture data bridge between XR (VR/AR) producer and mobile consumer. Streams hand joint coordinates, gesture state, and triggers haptic feedback.

## Architecture

```
Samah (XR Producer) → GestureBridge → Paithan (Mobile Consumer)
```

## API Endpoints

### POST /haptic/trigger
Trigger haptic feedback on XR device.

**Request Body:**
```json
{
  "gesture": "pinch|grab|swipe|fist",
  "intent": "select|grab|throw|menu",
  "intensity": 0.0-1.0,
  "zone": "palm|finger|knuckle",
  "timestamp": 1234567890
}
```

### GET /spatial/anchor
Returns current world anchor position for gesture origin.

**Response:**
```json
{
  "origin": { "x": 0, "y": 1.2, "z": -0.5 },
  "timestamp": 1234567890
}
```

### WS /events
Real-time stream for gesture chaining.

**Event Format:**
```json
{
  "gesture": "pinch|grab|swipe|fist",
  "intent": "select|grab|throw|menu",
  "intensity": 0.0-1.0,
  "origin": { "x": 0, "y": 1.2, "z": -0.5 },
  "timestamp": 1234567890
}
```

## Technical Requirements

- **Latency:** Sub-50ms target
- **Coordinate Frame:** Left-handed Y-up, meters
- **Origin:** Headset position at session start
- **Data Format:** JSON (binary compression optional for prototype)

## Data Flow

1. **Session Start:** Client calls `GET /spatial/anchor` to sync world anchor
2. **During Session:** WebSocket streams gesture events in real-time
3. **Haptic Trigger:** Client calls `POST /haptic/trigger` for feedback

## Implementation Notes

- Use FastAPI for REST endpoints
- Use websockets for real-time event stream
- Store origin anchor in memory (session-scoped)
