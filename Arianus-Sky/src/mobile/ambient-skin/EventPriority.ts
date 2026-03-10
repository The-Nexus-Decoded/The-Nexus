/**
 * EventPriority - Urgency classification and output routing
 * Maps events to visual/haptic output based on priority tier
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { 
  Urgency, 
  EventPriority, 
  IntentMetadata,
  SpatialHint 
} from './types';

// Priority tier definitions
const PRIORITY_TIERS: Record<EventPriority['tier'], EventPriority> = {
  'Quiet': {
    tier: 'Quiet',
    urgency: 'none',
    responseWindowMs: null
  },
  'Loud(1)': {
    tier: 'Loud(1)',
    urgency: 'normal',
    responseWindowMs: 300000 // 5 minutes
  },
  'Loud(2)': {
    tier: 'Loud(2)',
    urgency: 'high',
    responseWindowMs: 60000 // 1 minute
  },
  'Critical': {
    tier: 'Critical',
    urgency: 'critical',
    responseWindowMs: 0
  }
};

// Event type → priority tier mapping
const EVENT_PRIORITY_MAP: Record<string, EventPriority['tier']> = {
  // Quiet: Ambient updates
  ambient_update: 'Quiet',
  position_sync: 'Quiet',
  heartbeat: 'Quiet',
  
  // Loud(1): User-initiated, requires response
  message: 'Loud(1)',
  friend_request: 'Loud(1)',
  inventory_query: 'Loud(1)',
  map_update: 'Loud(1)',
  
  // Loud(2): Significant, time-sensitive
  quest_progress: 'Loud(2)',
  rare_item_spotted: 'Loud(2)',
  dungeon_ready: 'Loud(2)',
  group_invite: 'Loud(2)',
  
  // Critical: Urgent, session at risk
  combat: 'Critical',
  thermal_warning: 'Critical',
  connection_lost: 'Critical',
  session_expiry: 'Critical',
  player_death: 'Critical'
};

// Output configuration per tier
const TIER_OUTPUTS: Record<EventPriority['tier'], { haptic: string; visual: string; audio: boolean }> = {
  'Quiet': {
    haptic: 'none',
    visual: 'none',
    audio: false
  },
  'Loud(1)': {
    haptic: 'single_pulse',
    visual: 'badge',
    audio: false
  },
  'Loud(2)': {
    haptic: 'double_pulse',
    visual: 'notification',
    audio: false
  },
  'Critical': {
    haptic: 'sustained',
    visual: 'full',
    audio: true
  }
};

export interface EventOutput {
  priority: EventPriority;
  outputs: {
    haptic: string;
    visual: string;
    audio: boolean;
  };
  spatialHint: SpatialHint;
}

export class EventPrioritySystem {
  /**
   * Get priority for event type
   */
  static getPriority(eventType: string): EventPriority {
    const tier = EVENT_PRIORITY_MAP[eventType] ?? 'Quiet';
    return { ...PRIORITY_TIERS[tier] };
  }

  /**
   * Get priority tier
   */
  static getTier(eventType: string): EventPriority['tier'] {
    return EVENT_PRIORITY_MAP[eventType] ?? 'Quiet';
  }

  /**
   * Determine output configuration for event
   */
  static getOutput(eventType: string): EventOutput {
    const priority = this.getPriority(eventType);
    const outputs = { ...TIER_OUTPUTS[priority.tier] };
    
    // Determine spatial hint based on tier
    const spatialHint = this.determineSpatialHint(priority.tier);
    
    return { priority, outputs, spatialHint };
  }

  /**
   * Determine appropriate spatial hint based on priority
   */
  private static determineSpatialHint(tier: EventPriority['tier']): SpatialHint {
    switch (tier) {
      case 'Quiet':
        return 'haptic_only';
      case 'Loud(1)':
        return '2d_overlay';
      case 'Loud(2)':
        return '2d_overlay';
      case 'Critical':
        return '3d_spawn';
    }
  }

  /**
   * Create intent metadata from event
   */
  static createMetadata(eventType: string, userInitiated: boolean = false): IntentMetadata {
    const tier = this.getTier(eventType);
    const priority = PRIORITY_TIERS[tier];
    
    return {
      event_type: this.categorizeEvent(eventType),
      urgency: priority.urgency,
      response_window_ms: priority.responseWindowMs,
      user_initiated: userInitiated,
      action_required: priority.responseWindowMs !== null
    };
  }

  /**
   * Categorize event type
   */
  private static categorizeEvent(eventType: string): IntentMetadata['event_type'] {
    if (eventType.includes('combat') || eventType.includes('damage') || eventType.includes('death')) {
      return 'combat';
    }
    if (eventType.includes('thermal')) {
      return 'thermal';
    }
    if (eventType.includes('message') || eventType.includes('friend') || eventType.includes('trade')) {
      return 'social';
    }
    return 'message';
  }

  /**
   * Check if event should trigger notification
   */
  static shouldNotify(eventType: string): boolean {
    const tier = this.getTier(eventType);
    return tier !== 'Quiet';
  }

  /**
   * Check if event requires user action
   */
  static requiresAction(eventType: string): boolean {
    const priority = this.getPriority(eventType);
    return priority.responseWindowMs !== null;
  }

  /**
   * Check if response window expired
   */
  static isResponseExpired(metadata: IntentMetadata): boolean {
    if (metadata.response_window_ms === null) return false;
    // This would need timestamp tracking for actual implementation
    return false;
  }

  /**
   * Register custom priority mapping
   */
  static registerEvent(eventType: string, tier: EventPriority['tier']): void {
    EVENT_PRIORITY_MAP[eventType] = tier;
  }
}

// Export tier definitions for external use
export { PRIORITY_TIERS, TIER_OUTPUTS };
