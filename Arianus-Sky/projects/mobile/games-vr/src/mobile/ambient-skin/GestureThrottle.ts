/**
 * GestureThrottle - 10Hz throttle for intent emission
 * Per XRPC-SPEC.md: Background cache updates throttled to ≤10Hz
 */
export class GestureThrottle {
  private lastEmitMs: number = 0;
  private readonly INTERVAL_MS = 100; // 10Hz = 100ms

  /**
   * Check if enough time has passed to emit a new intent
   * @returns true if intent can be emitted, false if throttled
   */
  canEmit(): boolean {
    const now = Date.now();
    if (now - this.lastEmitMs >= this.INTERVAL_MS) {
      this.lastEmitMs = now;
      return true;
    }
    return false;
  }

  /**
   * Get the time remaining until next emit is allowed
   * @returns milliseconds until next emit, 0 if ready
   */
  getTimeUntilNextEmit(): number {
    const now = Date.now();
    const elapsed = now - this.lastEmitMs;
    return Math.max(0, this.INTERVAL_MS - elapsed);
  }

  /**
   * Reset the throttle timer
   */
  reset(): void {
    this.lastEmitMs = 0;
  }

  /**
   * Force-set the last emit time (for sync scenarios)
   */
  setLastEmitTime(timestamp: number): void {
    this.lastEmitMs = timestamp;
  }

  /**
   * Get current throttle rate in Hz
   */
  getRateHz(): number {
    return 1000 / this.INTERVAL_MS;
  }
}

export default GestureThrottle;
