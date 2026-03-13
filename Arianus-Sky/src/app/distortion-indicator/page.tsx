"use client";

import { useState, useEffect } from "react";

// Design tokens from Orla's spec
const TOKENS = {
  primary: "#00D4FF", // cyan glow
  background: "#1A1A2E", // deep background
  fallbackGrid: "#2D2D44", // muted grid
  pulseMs: 300,
  maxCycleMs: 2000,
};

type IndicatorState = "active" | "fallback";

export default function DistortionIndicatorDemo() {
  const [state, setState] = useState<IndicatorState>("active");
  const [fps, setFps] = useState(60);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Simulate FPS fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      // Occasional FPS drops to simulate performance variance
      const newFps = Math.random() > 0.7 ? 45 + Math.random() * 10 : 58 + Math.random() * 4;
      setFps(Math.round(newFps));
      setState(newFps >= 60 ? "active" : "fallback");
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation for active state
  useEffect(() => {
    if (state !== "active") return;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const phase = (elapsed % TOKENS.maxCycleMs) / TOKENS.maxCycleMs;
      setPulsePhase(phase);
      requestAnimationFrame(animate);
    };
    const rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [state]);

  const handleManualRefresh = () => {
    // Simulate re-attempting raycast
    setFps(62);
    setState("active");
  };

  const glowIntensity = state === "active" 
    ? 0.4 + 0.6 * Math.sin(pulsePhase * Math.PI * 2)
    : 0.2;

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: TOKENS.background }}
    >
      {/* Main content area */}
      <div className="relative z-10 p-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          Distortion Indicator
        </h1>
        <p className="text-gray-400 mb-8">VR Spatial Feedback Prototype</p>

        {/* State indicator */}
        <div className="flex items-center gap-4 mb-8">
          <div 
            className="px-4 py-2 rounded-full text-sm font-medium"
            style={{ 
              backgroundColor: state === "active" ? TOKENS.primary : TOKENS.fallbackGrid,
              color: state === "active" ? "#000" : "#888"
            }}
          >
            {state === "active" ? "Raycast Active" : "Static Fallback"}
          </div>
          <div className="text-gray-500">
            FPS: <span className="text-white font-mono">{fps}</span>
          </div>
        </div>

        {/* Interaction hint */}
        {state === "fallback" && (
          <button
            onClick={handleManualRefresh}
            className="px-6 py-3 rounded-lg text-white font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: TOKENS.fallbackGrid }}
          >
            Tap to Refresh Raycast
          </button>
        )}

        {/* Visual feedback demo area */}
        <div className="mt-12 p-6 rounded-xl border border-gray-800">
          <h2 className="text-lg text-gray-300 mb-4">L1 Visual Feedback</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Pulse:</span>
              <span className="text-white ml-2">{TOKENS.pulseMs}ms ease-out</span>
            </div>
            <div>
              <span className="text-gray-500">Cycle:</span>
              <span className="text-white ml-2">{TOKENS.maxCycleMs}ms max</span>
            </div>
            <div>
              <span className="text-gray-500">Glow:</span>
              <span className="text-white ml-2">{TOKENS.primary}</span>
            </div>
            <div>
              <span className="text-gray-500">Background:</span>
              <span className="text-white ml-2">{TOKENS.background}</span>
            </div>
          </div>
        </div>
      </div>

      {/* L1: Screen edge glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: state === "active" 
            ? `inset 0 0 ${100 + glowIntensity * 50}px ${TOKENS.primary}${Math.round(glowIntensity * 99).toString(16).padStart(2, '0')}`
            : `inset 0 0 30px ${TOKENS.fallbackGrid}`,
          transition: "box-shadow 300ms ease-out"
        }}
      />

      {/* L1: Pulsing grid overlay (active state) */}
      {state === "active" && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(${TOKENS.primary}22 1px, transparent 1px),
              linear-gradient(90deg, ${TOKENS.primary}22 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            transform: `scale(${1 + pulsePhase * 0.05})`,
            opacity: 0.2 + glowIntensity * 0.3,
            transition: "transform 300ms ease-out, opacity 300ms ease-out"
          }}
        />
      )}

      {/* L1: Static grid (fallback state) */}
      {state === "fallback" && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(${TOKENS.fallbackGrid} 1px, transparent 1px),
              linear-gradient(90deg, ${TOKENS.fallbackGrid} 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px"
          }}
        />
      )}

      {/* L1: 4-point corner anchors (active state) */}
      {state === "active" && (
        <>
          {/* Top-left */}
          <div 
            className="absolute top-8 left-8 w-4 h-4 pointer-events-none"
            style={{
              borderLeft: `2px solid ${TOKENS.primary}`,
              borderTop: `2px solid ${TOKENS.primary}`,
              opacity: 0.5 + glowIntensity * 0.5,
              transform: `scale(${0.8 + pulsePhase * 0.4})`,
              transition: "transform 300ms ease-out, opacity 300ms ease-out"
            }}
          />
          {/* Top-right */}
          <div 
            className="absolute top-8 right-8 w-4 h-4 pointer-events-none"
            style={{
              borderRight: `2px solid ${TOKENS.primary}`,
              borderTop: `2px solid ${TOKENS.primary}`,
              opacity: 0.5 + glowIntensity * 0.5,
              transform: `scale(${0.8 + pulsePhase * 0.4})`,
              transition: "transform 300ms ease-out, opacity 300ms ease-out"
            }}
          />
          {/* Bottom-left */}
          <div 
            className="absolute bottom-8 left-8 w-4 h-4 pointer-events-none"
            style={{
              borderLeft: `2px solid ${TOKENS.primary}`,
              borderBottom: `2px solid ${TOKENS.primary}`,
              opacity: 0.5 + glowIntensity * 0.5,
              transform: `scale(${0.8 + pulsePhase * 0.4})`,
              transition: "transform 300ms ease-out, opacity 300ms ease-out"
            }}
          />
          {/* Bottom-right */}
          <div 
            className="absolute bottom-8 right-8 w-4 h-4 pointer-events-none"
            style={{
              borderRight: `2px solid ${TOKENS.primary}`,
              borderBottom: `2px solid ${TOKENS.primary}`,
              opacity: 0.5 + glowIntensity * 0.5,
              transform: `scale(${0.8 + pulsePhase * 0.4})`,
              transition: "transform 300ms ease-out, opacity 300ms ease-out"
            }}
          />
        </>
      )}

      {/* Color shifts based on state */}
      {state === "active" && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${TOKENS.primary}, transparent)`,
            opacity: glowIntensity
          }}
        />
      )}
    </div>
  );
}
