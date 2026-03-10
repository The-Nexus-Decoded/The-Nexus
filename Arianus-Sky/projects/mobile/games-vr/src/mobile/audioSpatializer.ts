/**
 * Audio Spatializer
 * Spatial audio that pans to gesture direction per Orla's Feedback Topology
 * 
 * Visual: Color shift + scale + position drift
 * Haptic: Intensity maps to gesture velocity
 * Spatial: Audio pans to gesture direction
 * 
 * @author Paithan
 * @date 2026-03-09
 */

/**
 * Audio spatializer configuration
 */
export interface AudioSpatializerConfig {
  enabled: boolean;
  volume: number; // 0-1
  panningModel: 'equalpower' | 'HRTF';
}

/**
 * Audio cue types
 */
export type AudioCue = 'tap' | 'double_tap' | 'drag_start' | 'drag_move' | 'pinch' | 'rotate' | 'long_press' | 'grab' | 'release' | 'select';

/**
 * Audio Spatializer
 * Handles spatial audio feedback for gestures
 */
export class AudioSpatializer {
  private config: AudioSpatializerConfig;
  private audioContext: AudioContext | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffers: Map<AudioCue, AudioBuffer> = new Map();
  private initialized: boolean = false;

  constructor(config: Partial<AudioSpatializerConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      volume: config.volume ?? 0.7,
      panningModel: config.panningModel ?? 'equalpower'
    };
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.config.volume;
      
      // Create stereo panner
      this.pannerNode = this.audioContext.createStereoPanner();
      this.pannerNode.pan.value = 0;
      
      // Connect chain: source -> gain -> panner -> destination
      this.gainNode.connect(this.pannerNode);
      this.pannerNode.connect(this.audioContext.destination);

      // Generate default audio cues
      await this.generateDefaultCues();
      
      this.initialized = true;
      console.log('[AudioSpatializer] Initialized');
    } catch (e) {
      console.warn('[AudioSpatializer] Web Audio not available:', e);
    }
  }

  /**
   * Generate default synthesized audio cues
   */
  private async generateDefaultCues(): Promise<void> {
    if (!this.audioContext) return;

    const sampleRate = this.audioContext.sampleRate;

    // Tap: Short percussive click
    this.audioBuffers.set('tap', this.createPercussiveHit(50, 800, 0.1));
    
    // Double tap: Two quick clicks
    this.audioBuffers.set('double_tap', this.createPercussiveHit(40, 1000, 0.15));
    
    // Drag start: Soft swoosh
    this.audioBuffers.set('drag_start', this.createSwoosh(0.2, 300, 0.15));
    
    // Drag move: Subtle tick
    this.audioBuffers.set('drag_move', this.createPercussiveHit(20, 600, 0.05));
    
    // Pinch: Metallic stretch
    this.audioBuffers.set('pinch', this.createTone(400, 0.15, 'sine'));
    
    // Rotate: Continuous tone
    this.audioBuffers.set('rotate', this.createTone(300, 0.3, 'triangle'));
    
    // Long press: Deep pulse
    this.audioBuffers.set('long_press', this.createPercussiveHit(100, 200, 0.25));
    
    // Grab: Grip sound
    this.audioBuffers.set('grab', this.createPercussiveHit(80, 400, 0.12));
    
    // Release: Release sound
    this.audioBuffers.set('release', this.createPercussiveHit(30, 500, 0.1));
    
    // Select: Confirm sound
    this.audioBuffers.set('select', this.createConfirmChime());
  }

  /**
   * Create a percussive hit sound
   */
  private createPercussiveHit(frequency: number, decayMs: number, amplitude: number): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = decayMs / 1000;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * (1000 / decayMs));
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope;
      data[i] = sample * amplitude;
    }
    
    return buffer;
  }

  /**
   * Create a swoosh/sweep sound
   */
  private createSwoosh(duration: number, startFreq: number, amplitude: number): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration);
      const freq = startFreq + (t / duration) * 400;
      const sample = Math.sin(2 * Math.PI * freq * t) * envelope;
      data[i] = sample * amplitude * 0.5;
    }
    
    return buffer;
  }

  /**
   * Create a continuous tone
   */
  private createTone(frequency: number, duration: number, type: OscillatorType): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample: number;
      
      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'triangle':
          sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
          break;
        default:
          sample = Math.sin(2 * Math.PI * frequency * t);
      }
      
      data[i] = sample * 0.3;
    }
    
    return buffer;
  }

  /**
   * Create a confirmation chime (ascending tones)
   */
  private createConfirmChime(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const duration = 0.2;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8);
      let sample = 0;
      
      for (const freq of frequencies) {
        sample += Math.sin(2 * Math.PI * freq * t);
      }
      
      data[i] = (sample / frequencies.length) * envelope * 0.4;
    }
    
    return buffer;
  }

  /**
   * Play an audio cue with spatial panning
   * @param cue Audio cue type
   * @param panValue Stereo pan value (-1 to 1), derived from gesture direction
   */
  play(cue: AudioCue, panValue: number = 0): void {
    if (!this.config.enabled || !this.initialized || !this.audioContext || !this.gainNode) return;

    const buffer = this.audioBuffers.get(cue);
    if (!buffer) return;

    // Clamp pan value to valid range
    const pan = Math.max(-1, Math.min(1, panValue));

    // Create source for this playback
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Apply panning
    if (this.pannerNode) {
      // Disconnect and recreate panner for fresh state
      source.disconnect();
      source.connect(this.gainNode);
      this.pannerNode.pan.setValueAtTime(pan, this.audioContext.currentTime);
    }

    // Play
    source.start(0);
  }

  /**
   * Calculate pan value from gesture direction
   * @param fromX Start X position (0-1 normalized)
   * @param toX Current X position (0-1 normalized)
   */
  static calculatePan(fromX: number, toX: number): number {
    // Map screen X position to stereo pan
    // Left of screen = -1, center = 0, right = 1
    const centerX = (fromX + toX) / 2;
    return (centerX - 0.5) * 2; // -1 to 1
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.config.volume;
    }
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Resume audio context (needed after user gesture)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.initialized = false;
  }
}

/**
 * Singleton instance
 */
export const audioSpatializer = new AudioSpatializer();
