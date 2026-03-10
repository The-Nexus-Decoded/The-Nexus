"use strict";
// XR Module exports
// Mobile ↔ XR Interface implementation
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GESTURE_CONFIG = exports.PinchRecognizer = exports.GestureRecognizer = exports.createSpatialHintRenderer = exports.SpatialHintRenderer = exports.createManipulationIntent = exports.createXRWebSocketClient = exports.XRWebSocketClient = exports.MockHapticEmitter = exports.WebHapticEmitter = exports.AndroidHapticEmitter = exports.iOSHapticEmitter = exports.createGestureHapticBridge = exports.GestureHapticBridge = void 0;
exports.createXRModule = createXRModule;
// Types
__exportStar(require("./types"), exports);
// Core components
var GestureHapticBridge_1 = require("./GestureHapticBridge");
Object.defineProperty(exports, "GestureHapticBridge", { enumerable: true, get: function () { return GestureHapticBridge_1.GestureHapticBridge; } });
Object.defineProperty(exports, "createGestureHapticBridge", { enumerable: true, get: function () { return GestureHapticBridge_1.createGestureHapticBridge; } });
Object.defineProperty(exports, "iOSHapticEmitter", { enumerable: true, get: function () { return GestureHapticBridge_1.iOSHapticEmitter; } });
Object.defineProperty(exports, "AndroidHapticEmitter", { enumerable: true, get: function () { return GestureHapticBridge_1.AndroidHapticEmitter; } });
Object.defineProperty(exports, "WebHapticEmitter", { enumerable: true, get: function () { return GestureHapticBridge_1.WebHapticEmitter; } });
Object.defineProperty(exports, "MockHapticEmitter", { enumerable: true, get: function () { return GestureHapticBridge_1.MockHapticEmitter; } });
var XRWebSocketClient_1 = require("./XRWebSocketClient");
Object.defineProperty(exports, "XRWebSocketClient", { enumerable: true, get: function () { return XRWebSocketClient_1.XRWebSocketClient; } });
Object.defineProperty(exports, "createXRWebSocketClient", { enumerable: true, get: function () { return XRWebSocketClient_1.createXRWebSocketClient; } });
Object.defineProperty(exports, "createManipulationIntent", { enumerable: true, get: function () { return XRWebSocketClient_1.createManipulationIntent; } });
var SpatialHintRenderer_1 = require("./SpatialHintRenderer");
Object.defineProperty(exports, "SpatialHintRenderer", { enumerable: true, get: function () { return SpatialHintRenderer_1.SpatialHintRenderer; } });
Object.defineProperty(exports, "createSpatialHintRenderer", { enumerable: true, get: function () { return SpatialHintRenderer_1.createSpatialHintRenderer; } });
var GestureRecognizer_1 = require("./GestureRecognizer");
Object.defineProperty(exports, "GestureRecognizer", { enumerable: true, get: function () { return GestureRecognizer_1.GestureRecognizer; } });
Object.defineProperty(exports, "PinchRecognizer", { enumerable: true, get: function () { return GestureRecognizer_1.PinchRecognizer; } });
Object.defineProperty(exports, "DEFAULT_GESTURE_CONFIG", { enumerable: true, get: function () { return GestureRecognizer_1.DEFAULT_GESTURE_CONFIG; } });
// Default instance creators - importing factories
const GestureHapticBridge_2 = require("./GestureHapticBridge");
const XRWebSocketClient_2 = require("./XRWebSocketClient");
function createXRModule(wsUrl, platform) {
    const haptics = (0, GestureHapticBridge_2.createGestureHapticBridge)(platform);
    const ws = (0, XRWebSocketClient_2.createXRWebSocketClient)(wsUrl);
    return {
        haptics,
        ws,
        connect: () => ws.connect(),
        disconnect: () => ws.disconnect(),
    };
}
