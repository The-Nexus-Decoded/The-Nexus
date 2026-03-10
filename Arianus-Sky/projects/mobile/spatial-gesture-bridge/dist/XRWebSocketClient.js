"use strict";
// XR WebSocket Client
// Bidirectional state machine for Mobile ↔ XR communication
Object.defineProperty(exports, "__esModule", { value: true });
exports.XRWebSocketClient = void 0;
exports.createXRWebSocketClient = createXRWebSocketClient;
exports.createManipulationIntent = createManipulationIntent;
const types_1 = require("./types");
class XRWebSocketClient {
    constructor(url) {
        this.ws = null;
        this.state = 'disconnected';
        this.handlers = new Set();
        this.pendingIntents = new Map();
        this.presentationMode = 'ambient';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageQueue = [];
        this.intentQueue = [];
        this.reconciliationMode = 'merge';
        this.url = url;
    }
    // ==================== Reconciliation Mode ====================
    setReconciliationMode(mode) {
        this.reconciliationMode = mode;
        const config = types_1.RECONCILIATION_CONFIG[mode];
        // Apply mode-specific behavior
        switch (mode) {
            case 'queue_flush':
                this.clearPendingIntents();
                break;
            case 'last_wins':
                // Trim to maxQueueSize, keeping newest
                if (this.intentQueue.length > config.maxQueueSize) {
                    this.intentQueue = this.intentQueue.slice(-config.maxQueueSize);
                }
                break;
            case 'merge':
                // Already combined, no action needed
                break;
        }
    }
    getReconciliationMode() {
        return this.reconciliationMode;
    }
    // ==================== Connection Management ====================
    async connect() {
        if (this.state === 'connected' || this.state === 'connecting') {
            return;
        }
        this.setState('connecting');
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                this.ws.onopen = () => {
                    this.setState('connected');
                    this.reconnectAttempts = 0;
                    this.flushMessageQueue();
                    resolve();
                };
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    }
                    catch (e) {
                        console.error('[XR WS] Failed to parse message:', e);
                    }
                };
                this.ws.onclose = () => {
                    this.setState('disconnected');
                    this.attemptReconnect();
                };
                this.ws.onerror = (error) => {
                    console.error('[XR WS] Error:', error);
                    reject(error);
                };
            }
            catch (e) {
                this.setState('disconnected');
                reject(e);
            }
        });
    }
    disconnect() {
        this.maxReconnectAttempts = 0; // Prevent reconnect
        this.ws?.close();
        this.setState('disconnected');
    }
    setState(newState) {
        this.state = newState;
        console.log('[XR WS] State:', newState);
    }
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[XR WS] Max reconnect attempts reached');
            return;
        }
        this.setState('reconnecting');
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        setTimeout(() => {
            this.connect().catch(() => {
                console.log('[XR WS] Reconnect failed, will retry...');
            });
        }, delay);
    }
    // ==================== Message Handling ====================
    onMessage(handler) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }
    handleMessage(message) {
        switch (message.type) {
            case 'response':
                this.handleResponse(message);
                break;
            case 'state':
                this.presentationMode = message.state;
                break;
        }
        this.handlers.forEach((handler) => handler(message));
    }
    handleResponse(message) {
        const pending = this.pendingIntents.get(message.intentId);
        if (pending) {
            clearTimeout(pending.timeoutId);
            this.pendingIntents.delete(message.intentId);
        }
        if (message.status === 'rejected') {
            console.warn('[XR WS] Intent rejected:', message.error);
        }
    }
    // ==================== Sending Messages ====================
    send(message) {
        if (this.state !== 'connected') {
            this.messageQueue.push(message);
            return;
        }
        const data = JSON.stringify(message);
        this.ws?.send(data);
    }
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message)
                this.send(message);
        }
    }
    // ==================== State Updates ====================
    sendState(state, ttl_ms) {
        const message = {
            type: 'state',
            state,
            timestamp: Date.now(),
            ttl_ms,
        };
        this.send(message);
    }
    setPresentationMode(mode) {
        this.presentationMode = mode;
        this.sendState(mode);
    }
    getPresentationMode() {
        return this.presentationMode;
    }
    // ==================== Intent Pipeline ====================
    sendIntent(intent) {
        const config = types_1.INTENT_QUEUE_CONFIG;
        // Check queue overflow (threshold: 50)
        if (this.intentQueue.length >= config.overflowThreshold) {
            if (config.overflowBehavior === 'drop_oldest') {
                console.warn('[XR WS] Intent queue overflow, dropping oldest');
                this.intentQueue.shift();
            }
            else {
                console.warn('[XR WS] Intent queue overflow, rejecting new intent');
                return; // Reject new intent
            }
        }
        // Check depth cap
        if (this.intentQueue.length >= config.maxDepth) {
            // FIFO drop
            this.intentQueue.shift();
        }
        // Set up timeout
        const timeoutId = setTimeout(() => {
            this.handleIntentTimeout(intent.intentId);
        }, types_1.TIMING.maxRoundTripLatency);
        const pending = {
            intent,
            timestamp: Date.now(),
            timeoutId,
        };
        this.pendingIntents.set(intent.intentId, pending);
        this.intentQueue.push(intent);
        const message = {
            type: 'intent',
            intent,
            source: 'menu',
        };
        this.send(message);
    }
    handleIntentTimeout(intentId) {
        const pending = this.pendingIntents.get(intentId);
        if (pending) {
            this.pendingIntents.delete(intentId);
            const errorResponse = {
                type: 'response',
                intentId,
                status: 'rejected',
                error: {
                    code: 'timeout',
                    message: "VR didn't respond within latency budget",
                },
            };
            this.handleMessage(errorResponse);
        }
    }
    // ==================== Gesture Events ====================
    sendGesture(gestureType, confidence, hapticsApplied) {
        const message = {
            type: 'gesture',
            gesture: {
                type: gestureType,
                timestamp: Date.now(),
                confidence,
            },
            haptics_applied: hapticsApplied,
        };
        this.send(message);
    }
    // ==================== Queue Management ====================
    getPendingIntents() {
        return Array.from(this.pendingIntents.values()).map((p) => p.intent);
    }
    clearPendingIntents() {
        this.pendingIntents.forEach((pending) => {
            clearTimeout(pending.timeoutId);
        });
        this.pendingIntents.clear();
        this.intentQueue = [];
    }
    getConnectionState() {
        return this.state;
    }
    isConnected() {
        return this.state === 'connected';
    }
}
exports.XRWebSocketClient = XRWebSocketClient;
// ==================== Factory ====================
function createXRWebSocketClient(url) {
    return new XRWebSocketClient(url);
}
// ==================== Intent Builders ====================
function createManipulationIntent(action, axis, method, confidence = 1.0) {
    const previewTypes = {
        move: 'ghost_wireframe',
        rotate: 'rotation_ring',
        scale: 'corner_handles',
    };
    return {
        intentId: generateUUID(),
        intent: 'manipulate',
        action,
        axis,
        method,
        preview: {
            type: previewTypes[action],
            uniform: action !== 'move',
        },
        confidence,
        user_can_override: true,
    };
}
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
