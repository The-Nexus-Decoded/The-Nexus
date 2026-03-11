/**
 * Gesture Resolver - Usage Example
 * VR-side implementation
 */

import { 
  GestureBridge, 
  VisualFeedback,
  GestureEvent,
  AmbientMode,
  GestureState
} from './index';

// 1. Initialize the GestureBridge
const gestureBridge = new GestureBridge({
  doubleTapThreshold: 300,
  longPressThreshold: 500,
  rateLimitMs: 2000,
});

gestureBridge.initialize();

// 2. Set up visual feedback
const visualFeedback = new VisualFeedback();

// 3. Register gesture handler
gestureBridge.onGesture((event: GestureEvent) => {
  console.log(`Gesture: ${event.gesture}`, event);
  
  // Handle by gesture type
  switch (event.gesture) {
    case 'double_tap':
      visualFeedback.success();
      // Trigger double-tap VR action
      break;
    case 'tap':
      visualFeedback.success();
      // Trigger tap VR action
      break;
    case 'long_press':
      visualFeedback.active();
      // Trigger hold VR action
      break;
    case 'rotate':
      visualFeedback.success();
      // Trigger rotation
      break;
  }
});

// 4. Handle ambient modes
function setAmbientMode(mode: AmbientMode) {
  gestureBridge.setAmbientMode(mode);
  console.log(`Ambient mode: ${mode}, State: ${gestureBridge.getState()}`);
}

// Example: set to ambient mode
// setAmbientMode('ambient');

// 5. Cleanup on scene exit
// gestureBridge.destroy();
