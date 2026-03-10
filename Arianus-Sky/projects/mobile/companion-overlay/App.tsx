/**
 * Spatial Gesture Bridge - Mobile Companion Overlay
 * Phone-as-controller for Samah's XR layer
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { GestureRecognizer, SpatialIntent, IntentEmitter } from './src/mobile/spatial-gesture-bridge';
import { HapticEngine } from './src/mobile/hapticEngine';

// ============================================================================
// DESIGN TOKENS (from tokens.json)
// ============================================================================

const TOKENS = {
  colors: {
    ringFill: '#00D4FF',
    error: '#FF4757',
    committed: '#FFD700',
    ringBackground: '#1A1A2E',
    background: 'rgba(10, 10, 15, 0.85)',
    text: '#E8E8F0',
    muted: '#8892A0',
  },
  animation: {
    ackDuration: 300,
    commitDuration: 500,
  },
  packetLoss: {
    bufferMs: 8,
    thresholds: {
      silent: 5000,
      delayed: 15000,
      unstable: 30000,
    },
  },
};

// ============================================================================
// STYLES
// ============================================================================

const STYLES = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  hud: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: TOKENS.colors.background,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    minWidth: 180,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  realmName: {
    fontSize: 24,
    fontWeight: '700',
    color: TOKENS.colors.ringFill,
  },
  coordsContainer: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CCCCDD',
  },
  coords: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: TOKENS.colors.muted,
  },
  feedbackRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackRingIdle: {
    borderColor: TOKENS.colors.ringFill,
    opacity: 0.3,
  },
  feedbackRingAck: {
    borderColor: TOKENS.colors.ringFill,
    opacity: 1,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
  },
  feedbackRingCommitted: {
    borderColor: TOKENS.colors.committed,
    opacity: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  feedbackRingError: {
    borderColor: TOKENS.colors.error,
    opacity: 1,
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
  },
  latencyLabel: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#FFFFFF',
    opacity: 0.7,
  },
  touchArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: TOKENS.colors.ringFill,
    opacity: 0.5,
  },
  statusBar: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: TOKENS.colors.background,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  statusText: {
    fontSize: 12,
    color: TOKENS.colors.muted,
  },
  reconnectUI: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  reconnectText: {
    fontSize: 18,
    color: TOKENS.colors.error,
    fontWeight: '600',
  },
  reconnectSubtext: {
    fontSize: 14,
    color: TOKENS.colors.muted,
    marginTop: 8,
  },
});

// ============================================================================
// TYPES
// ============================================================================

type RingState = 'idle' | 'ack' | 'committed' | 'error';
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'delayed' | 'unstable' | 'reconnect';

interface AckStatus {
  gestureId: string;
  status: 'received' | 'processed' | 'failed';
  processedAt?: number;
  error?: string;
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function CompanionOverlay() {
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [ringState, setRingState] = useState<RingState>('idle');
  const [lastIntent, setLastIntent] = useState<string>('—');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');
  const [latency, setLatency] = useState<number>(0);
  const [lastAckTime, setLastAckTime] = useState<number>(0);
  
  const gestureRecognizer = useRef(new GestureRecognizer());
  const intentEmitter = useRef<IntentEmitter | null>(null);
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastSentTime = useRef<number>(0);
  const ringTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // WebSocket connection
  useEffect(() => {
    const wsUrl = 'ws://localhost:8080/ws/vr-game';
    intentEmitter.current = new IntentEmitter(wsUrl);
    intentEmitter.current.connect();
    
    setConnectionStatus('connecting');
    
    // Monitor connection health
    const healthCheck = setInterval(() => {
      const timeSinceAck = Date.now() - lastAckTime;
      const thresholds = TOKENS.packetLoss.thresholds;
      
      if (timeSinceAck > thresholds.unstable) {
        setConnectionStatus('unstable');
      } else if (timeSinceAck > thresholds.delayed) {
        setConnectionStatus('delayed');
      } else if (timeSinceAck <= thresholds.silent && connectionStatus !== 'connecting') {
        setConnectionStatus('connected');
      }
    }, 1000);
    
    return () => {
      clearInterval(healthCheck);
      intentEmitter.current?.disconnect();
    };
  }, []);

  // Handle ACK from XR layer
  const handleAck = useCallback((ack: AckStatus) => {
    const now = Date.now();
    setLatency(now - lastSentTime.current);
    setLastAckTime(now);
    
    if (ack.status === 'received') {
      setRingState('ack');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Clear previous timeout
      if (ringTimeout.current) clearTimeout(ringTimeout.current);
      
      // Revert to idle after ACK duration
      ringTimeout.current = setTimeout(() => {
        setRingState('idle');
      }, TOKENS.animation.ackDuration);
    } else if (ack.status === 'processed') {
      setRingState('committed');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (ringTimeout.current) clearTimeout(ringTimeout.current);
      
      ringTimeout.current = setTimeout(() => {
        setRingState('idle');
      }, TOKENS.animation.commitDuration);
    } else if (ack.status === 'failed') {
      setRingState('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      if (ringTimeout.current) clearTimeout(ringTimeout.current);
      
      ringTimeout.current = setTimeout(() => {
        setRingState('idle');
      }, TOKENS.animation.commitDuration);
    }
  }, []);

  // Handle incoming spatial intents
  const handleIntent = useCallback((intent: SpatialIntent) => {
    lastSentTime.current = Date.now();
    setLastIntent(`${intent.action} (${(intent.confidence * 100).toFixed(0)}%)`);
    
    // Emit to XR layer
    intentEmitter.current?.emit(intent);
    
    // Trigger haptics based on action
    switch (intent.action) {
      case 'SELECT':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'TRANSLATE':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'SCALE':
      case 'ROTATE':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'GRAB':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
    }

    // Update position display
    if (intent.vector.position) {
      setPosition({
        x: intent.vector.position[0],
        y: intent.vector.position[1],
        z: intent.vector.position[2] || 0,
      });
    }
  }, []);

  // Get ring style based on state
  const getRingStyle = () => {
    switch (ringState) {
      case 'ack': return STYLES.feedbackRingAck;
      case 'committed': return STYLES.feedbackRingCommitted;
      case 'error': return STYLES.feedbackRingError;
      default: return STYLES.feedbackRingIdle;
    }
  };

  // Get connection status display
  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case 'connected': return { text: '●', color: TOKENS.colors.ringFill };
      case 'connecting': return { text: '○', color: TOKENS.colors.muted };
      case 'delayed': return { text: '◐', color: '#F59E0B' };
      case 'unstable': return { text: '◑', color: TOKENS.colors.error };
      case 'reconnect': return { text: '✕', color: TOKENS.colors.error };
      default: return { text: '○', color: TOKENS.colors.muted };
    }
  };

  // PanResponder for gesture handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;
        
        for (let i = 0; i < touches.length; i++) {
          const touch = touches[i];
          const touchId = Number(touch.identifier) || i;
          activeTouches.current.set(touchId, { x: touch.pageX, y: touch.pageY });
          
          const intent = gestureRecognizer.current.onTouchStart(
            touchId,
            { x: touch.pageX, y: touch.pageY },
            Date.now()
          );
          if (intent) handleIntent(intent);
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;
        
        for (let i = 0; i < touches.length; i++) {
          const touch = touches[i];
          const touchId = Number(touch.identifier) || i;
          activeTouches.current.set(touchId, { x: touch.pageX, y: touch.pageY });
          
          const intent = gestureRecognizer.current.onTouchMove(
            touchId,
            { x: touch.pageX, y: touch.pageY },
            Date.now(),
            activeTouches.current as any
          );
          if (intent) handleIntent(intent);
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;
        const previousTouches = new Map(activeTouches.current);
        
        for (const [id, point] of previousTouches) {
          let found = false;
          for (let i = 0; i < touches.length; i++) {
            const touchId = Number(touches[i].identifier) || i;
            if (touchId === id) {
              found = true;
              break;
            }
          }
          if (!found) {
            const intent = gestureRecognizer.current.onTouchEnd(
              Number(id),
              point,
              Date.now(),
              activeTouches.current as any
            );
            if (intent) handleIntent(intent);
            activeTouches.current.delete(id);
          }
        }
      },
      onPanResponderTerminate: () => {
        activeTouches.current.clear();
      },
    })
  ).current;

  const connDisplay = getConnectionDisplay();

  return (
    <View style={STYLES.container} {...panResponder.panHandlers}>
      {/* HUD Overlay */}
      <BlurView intensity={12} tint="dark" style={STYLES.hud}>
        <View style={STYLES.header}>
          <View style={[STYLES.feedbackRing, getRingStyle()]}>
            {latency > 0 && (
              <Text style={STYLES.latencyLabel}>{latency}ms</Text>
            )}
          </View>
          <Text style={STYLES.realmName}>REALM</Text>
        </View>
        
        <View style={STYLES.coordsContainer}>
          <Text style={STYLES.label}>POSITION</Text>
          <Text style={STYLES.coords}>
            x:{position.x.toFixed(1)} y:{position.y.toFixed(1)} z:{position.z.toFixed(1)}
          </Text>
        </View>

        <View style={STYLES.coordsContainer}>
          <Text style={STYLES.label}>PLANE</Text>
          <Text style={STYLES.coords}>1.5m @ 15°</Text>
        </View>
      </BlurView>

      {/* Touch Area Indicator */}
      <View style={STYLES.touchArea}>
        <View style={STYLES.touchIndicator} />
      </View>

      {/* Status Bar */}
      <View style={STYLES.statusBar}>
        <Text style={STYLES.statusText}>INTENT: {lastIntent}</Text>
        <Text style={[STYLES.statusText, { color: connDisplay.color }]}>
          XR: {connDisplay.text} {connectionStatus}
        </Text>
      </View>

      {/* Reconnect UI (shown when connection lost) */}
      {connectionStatus === 'reconnect' && (
        <View style={STYLES.reconnectUI}>
          <Text style={STYLES.reconnectText}>Return to Spatial</Text>
          <Text style={STYLES.reconnectSubtext}>Connection lost</Text>
        </View>
      )}
    </View>
  );
}
