"""
GestureBridge - XR Gesture Data Bridge

Real-time gesture streaming between XR producer and mobile consumer.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional
import json
import time
from datetime import datetime

app = FastAPI(title="GestureBridge", version="0.1.0")

# Session-scoped world anchor
_anchor = {"x": 0.0, "y": 0.0, "z": 0.0}
_anchor_timestamp = 0


class HapticTrigger(BaseModel):
    gesture: str  # pinch|grab|swipe|fist
    intent: str   # select|grab|throw|menu
    intensity: float  # 0.0-1.0
    zone: str  # palm|finger|knuckle
    timestamp: Optional[int] = None


class SpatialAnchor(BaseModel):
    origin: dict
    timestamp: int


class GestureEvent(BaseModel):
    gesture: str
    intent: str
    intensity: float
    origin: dict
    timestamp: int


# Active WebSocket connections
_active_connections: list[WebSocket] = []


@app.post("/haptic/trigger")
async def trigger_haptic(trigger: HapticTrigger):
    """Trigger haptic feedback on XR device."""
    if trigger.timestamp is None:
        trigger.timestamp = int(time.time())
    
    # Broadcast to all connected clients
    event = {
        "type": "haptic",
        "gesture": trigger.gesture,
        "intent": trigger.intent,
        "intensity": trigger.intensity,
        "zone": trigger.zone,
        "timestamp": trigger.timestamp
    }
    
    for connection in _active_connections:
        try:
            await connection.send_json(event)
        except Exception:
            pass  # Connection may be dead
    
    return {"status": "triggered", "event": event}


@app.get("/spatial/anchor")
async def get_spatial_anchor():
    """Get current world anchor position for gesture origin."""
    return {
        "origin": _anchor,
        "timestamp": _anchor_timestamp
    }


@app.post("/spatial/anchor")
async def set_spatial_anchor(anchor: SpatialAnchor):
    """Set world anchor position (called on session start)."""
    global _anchor, _anchor_timestamp
    _anchor = anchor.origin
    _anchor_timestamp = anchor.timestamp
    return {"status": "anchor_set", "origin": _anchor}


@app.websocket("/events")
async def websocket_events(websocket: WebSocket):
    """Real-time stream for gesture chaining."""
    await websocket.accept()
    _active_connections.append(websocket)
    
    try:
        while True:
            # Receive gesture events from producer
            data = await websocket.receive_text()
            event = json.loads(data)
            
            # Add timestamp if missing
            if "timestamp" not in event:
                event["timestamp"] = int(time.time())
            
            # Broadcast to all connected clients
            for connection in _active_connections:
                if connection != websocket:
                    try:
                        await connection.send_json(event)
                    except Exception:
                        pass
                        
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in _active_connections:
            _active_connections.remove(websocket)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "GestureBridge",
        "version": "0.1.0",
        "active_connections": len(_active_connections)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
