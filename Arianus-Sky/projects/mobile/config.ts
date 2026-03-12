// Mobile Gesture Configuration
// Used by gesture-stream.ts and spatial-api-client.ts

export const config = {
  // WebSocket endpoint for XR intent handoff (gesture emission)
  // Override via XRPC_WS_ENDPOINT env var
  wsEndpoint: process.env.XRPC_WS_ENDPOINT || 'ws://localhost:7890/xrpc',

  // Events WebSocket endpoint (for receiving anchor updates, etc.)
  // Override via SPATIAL_WS_ENDPOINT env var  
  eventsEndpoint: process.env.SPATIAL_WS_ENDPOINT || 'ws://localhost:7891/events',

  // HTTP base URL for spatial/haptic APIs
  // Override via SPATIAL_HTTP_BASE env var
  httpBase: process.env.SPATIAL_HTTP_BASE || 'http://localhost:7891',

  // Connection settings
  reconnect: {
    minBackoffMs: 1000,
    maxBackoffMs: 8000,
  },

  // Gesture throttling
  throttle: {
    intervalMs: 100, // 10Hz max
  },

  // Session settings
  session: {
    idleTimeoutMs: 60000,
    expiryMs: 300000,
  },

  // Intent settings
  intent: {
    queueDepth: 3,
    ttlMs: 5000,
    ackTimeoutMs: 2000,
  },

  // Undo window
  undo: {
    windowMs: 3000,
  },
};
