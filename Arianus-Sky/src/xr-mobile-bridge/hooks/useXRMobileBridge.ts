import { useEffect, useRef, useState, useCallback } from 'react';
import {
  XRMobileBridge,
  XRMobileBridgeConfig,
  ProximitySensor,
  ThermalMonitor,
  HapticEngine,
  ConnectionState,
  ProximityZone,
  ThermalTier,
  RenderPayload,
  CONFIDENCE_EXECUTE,
  CONFIDENCE_QUEUE,
} from '../types';

export interface UseXRMobileBridgeOptions extends XRMobileBridgeConfig {
  autoConnect?: boolean;
  proximityEnabled?: boolean;
  thermalEnabled?: boolean;
}

export interface XRBridgeState {
  connectionState: ConnectionState;
  proximityZone: ProximityZone;
  thermalTier: ThermalTier;
  isConnected: boolean;
  isArmed: boolean;
  isActive: boolean;
}

export interface UseXRMobileBridgeReturn {
  state: XRBridgeState;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendGesture: (gesture: string, confidence: number, data?: {
    position?: { x: number; y: number; z?: number };
    velocity?: number;
    duration?: number;
  }) => void;
  sendThermal: (chipTemp: number) => void;
  sendProximity: (distance: number) => void;
}

export function useXRMobileBridge(
  options: UseXRMobileBridgeOptions
): UseXRMobileBridgeReturn {
  const bridgeRef = useRef<XRMobileBridge | null>(null);
  const proximityRef = useRef<ProximitySensor | null>(null);
  const thermalRef = useRef<ThermalMonitor | null>(null);
  const hapticRef = useRef<HapticEngine | null>(null);

  const [state, setState] = useState<XRBridgeState>({
    connectionState: 'disconnected',
    proximityZone: 'far',
    thermalTier: 0,
    isConnected: false,
    isArmed: false,
    isActive: false,
  });

  // Initialize bridge
  useEffect(() => {
    // Create haptic engine
    hapticRef.current = new HapticEngine();

    // Create WebSocket bridge
    bridgeRef.current = new XRMobileBridge({
      ...options,
      onStateChange: (connectionState) => {
        setState((prev) => ({
          ...prev,
          connectionState,
          isConnected: connectionState === 'operational' || connectionState === 'authenticated',
        }));
      },
      onMessage: (payload) => {
        // Handle incoming haptics from server
        if (payload.type === 'haptic' && payload.data) {
          hapticRef.current?.playFromServer(payload.data as any);
        }
      },
    });

    // Create proximity sensor
    proximityRef.current = new ProximitySensor({
      onZoneChange: (zone, distance) => {
        setState((prev) => ({
          ...prev,
          proximityZone: zone,
          isArmed: zone === 'mid' || zone === 'near' || zone === 'intimate',
          isActive: zone === 'near' || zone === 'intimate',
        }));
        
        // Send proximity to server
        bridgeRef.current?.sendProximity(distance);
      },
      onWake: () => {
        hapticRef.current?.playWakeHaptic();
      },
      onSleep: () => {
        hapticRef.current?.playSleepHaptic();
      },
    });

    // Create thermal monitor
    thermalRef.current = new ThermalMonitor({
      onTierChange: (tier) => {
        setState((prev) => ({
          ...prev,
          thermalTier: tier,
        }));
        
        // Send thermal to server
        const data = thermalRef.current?.getThermalData();
        if (data) {
          // Could send thermal updates to server
        }
      },
    });

    // Auto-connect if enabled
    if (options.autoConnect) {
      bridgeRef.current.connect().catch(console.error);
    }

    return () => {
      bridgeRef.current?.disconnect();
      proximityRef.current?.destroy();
      thermalRef.current?.destroy();
    };
  }, []);

  const connect = useCallback(async () => {
    await bridgeRef.current?.connect();
    
    if (options.proximityEnabled) {
      proximityRef.current?.update(0); // Initialize
    }
    
    if (options.thermalEnabled) {
      thermalRef.current?.start();
    }
  }, [options.proximityEnabled, options.thermalEnabled]);

  const disconnect = useCallback(() => {
    bridgeRef.current?.disconnect();
    proximityRef.current?.destroy();
    thermalRef.current?.stop();
  }, []);

  const sendGesture = useCallback((
    gesture: string,
    confidence: number,
    data?: {
      position?: { x: number; y: number; z?: number };
      velocity?: number;
      duration?: number;
    }
  ) => {
    // Check confidence threshold
    if (confidence < CONFIDENCE_QUEUE) {
      return; // Ignore
    }

    // Queue for confirmation if in 0.60-0.84 range
    // (Would need additional UI logic for this)
    
    bridgeRef.current?.sendGesture({
      gesture: gesture as any,
      confidence,
      ...data,
    });
  }, []);

  const sendThermal = useCallback((chipTemp: number) => {
    bridgeRef.current?.sendThermal(chipTemp);
  }, []);

  const sendProximity = useCallback((distance: number) => {
    proximityRef.current?.update(distance);
  }, []);

  return {
    state,
    connect,
    disconnect,
    sendGesture,
    sendThermal,
    sendProximity,
  };
}
