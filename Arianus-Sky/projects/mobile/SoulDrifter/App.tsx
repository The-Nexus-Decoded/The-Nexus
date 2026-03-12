import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Orla's HUD Design Spec
const COLORS = {
  soulOrb: '#00FFFF',
  healthBar: '#FF4444',
  healthBarLight: '#FF6666',
  zonePill: 'rgba(0, 0, 0, 0.6)',
  textWhite: '#FFFFFF',
  background: '#0D1117',
  platform: '#1A1A1A',
  thermal: '#FF6B35',
};

// Zone A: Spawn Chamber (8x8x6m representation)
const ZONE_A_GEOMETRY = {
  name: 'SPAWN CHAMBER',
  width: 8,
  depth: 8,
  height: 6,
  thermalTriggerDistance: 2,
};

// Game State
interface GameState {
  souls: number;
  health: number;
  maxHealth: number;
  currentZone: string;
  thermalDiscovered: boolean;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    souls: 0,
    health: 100,
    maxHealth: 100,
    currentZone: 'ZONE A',
    thermalDiscovered: false,
  });

  // Animation refs
  const thermalOpacity = useRef(new Animated.Value(0)).current;
  const healthWidth = useRef(new Animated.Value(100)).current;
  const soulScale = useRef(new Animated.Value(1)).current;

  // Simulate thermal discovery at center
  useEffect(() => {
    const timer = setTimeout(() => {
      setGameState((prev) => ({ ...prev, thermalDiscovered: true }));
      Animated.sequence([
        Animated.timing(thermalOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(thermalOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Soul collection animation
  const collectSoul = () => {
    setGameState((prev) => ({ ...prev, souls: prev.souls + 1 }));
    Animated.sequence([
      Animated.timing(soulScale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(soulScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]]).start();
  };

  // Simulate taking damage
  const takeDamage = (amount: number) => {
    setGameState((prev) => {
      const newHealth = Math.max(0, prev.health - amount);
      Animated.timing(healthWidth, {
        toValue: (newHealth / prev.maxHealth) * 100,
        duration: 200,
        useNativeDriver: false,
      }).start();
      return { ...prev, health: newHealth };
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Zone Indicator - Top Left (Orla Spec) */}
      <View style={styles.zoneIndicator}>
        <Text style={styles.zoneText}>{gameState.currentZone}</Text>
      </View>

      {/* Soul Counter - Top Right (Orla Spec) */}
      <View style={styles.soulCounter}>
        <Animated.Text
          style={[styles.soulIcon, { transform: [{ scale: soulScale }] }]}
        >
          ♾
        </Animated.Text>
        <Text style={styles.soulCount}>{gameState.souls}</Text>
      </View>

      {/* Thermal Discovery - Center (Orla Spec) */}
      <Animated.View
        style={[
          styles.thermalDiscovery,
          { opacity: thermalOpacity },
        ]}
      >
        <Text style={styles.thermalText}>ARIANUS-SKY DISCOVERED</Text>
      </Animated.View>

      {/* Zone A - Spawn Chamber Representation */}
      <View style={styles.zoneContainer}>
        {/* Spawn Platform */}
        <View style={styles.platform}>
          <Text style={styles.platformLabel}>SPAWN POINT</Text>
        </View>
        
        {/* Thermal Trigger Zone */}
        <View style={styles.thermalZone}>
          <View style={styles.thermalRing} />
          <Text style={styles.thermalHint}>Thermal Source</Text>
        </View>

        {/* Soul Collectible */}
        <TouchableOpacity
          style={styles.soulOrb}
          onPress={collectSoul}
          activeOpacity={0.7}
        >
          <Text style={styles.soulOrbText}>♾</Text>
        </TouchableOpacity>

        {/* Test Damage Button */}
        <TouchableOpacity
          style={styles.damageButton}
          onPress={() => takeDamage(15)}
        >
          <Text style={styles.damageButtonText}>TEST DAMAGE</Text>
        </TouchableOpacity>

        {/* Zone B Portal */}
        <TouchableOpacity style={styles.portal}>
          <Text style={styles.portalText}>→ ZONE B</Text>
        </TouchableOpacity>
      </View>

      {/* Health Bar - Bottom Center (Orla Spec) */}
      <View style={styles.healthBarContainer}>
        <View style={styles.healthBarBackground}>
          <Animated.View
            style={[
              styles.healthBarFill,
              { width: healthWidth },
            ]}
          />
        </View>
        <Text style={styles.healthText}>
          {gameState.health}/{gameState.maxHealth}
        </Text>
      </View>

      {/* Touch Controls */}
      <View style={styles.touchControls}>
        <View style={styles.dpad}>
          <TouchableOpacity style={styles.dpadButton}><Text style={styles.dpadText}>↑</Text></TouchableOpacity>
          <View style={styles.dpadRow}>
            <TouchableOpacity style={styles.dpadButton}><Text style={styles.dpadText}>←</Text></TouchableOpacity>
            <TouchableOpacity style={styles.dpadButton}><Text style={styles.dpadText}>●</Text></TouchableOpacity>
            <TouchableOpacity style={styles.dpadButton}><Text style={styles.dpadText}>→</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.dpadButton}><Text style={styles.dpadText}>↓</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Zone Indicator - Top Left (Orla Spec: 24px from top, 24px from left)
  zoneIndicator: {
    position: 'absolute',
    top: 24,
    left: 24,
    backgroundColor: COLORS.zonePill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  zoneText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // Soul Counter - Top Right (Orla Spec: 24px from top, 24px from right)
  soulCounter: {
    position: 'absolute',
    top: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.zonePill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  soulIcon: {
    fontSize: 16,
    color: COLORS.soulOrb,
    marginRight: 8,
  },
  soulCount: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Thermal Discovery - Center (Orla Spec)
  thermalDiscovery: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  thermalText: {
    color: COLORS.soulOrb,
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: COLORS.soulOrb,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  // Zone A Container
  zoneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platform: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.platform,
    borderWidth: 2,
    borderColor: COLORS.thermal,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  platformLabel: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontWeight: 'bold',
  },
  thermalZone: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.thermal,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.3,
  },
  thermalRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.thermal,
    opacity: 0.2,
  },
  thermalHint: {
    position: 'absolute',
    bottom: -30,
    color: COLORS.thermal,
    fontSize: 12,
  },
  soulOrb: {
    position: 'absolute',
    right: 40,
    top: SCREEN_HEIGHT * 0.35,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.soulOrb,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.soulOrb,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  soulOrbText: {
    fontSize: 24,
    color: COLORS.background,
  },
  damageButton: {
    position: 'absolute',
    left: 40,
    top: SCREEN_HEIGHT * 0.35,
    backgroundColor: '#FF4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  damageButtonText: {
    color: COLORS.textWhite,
    fontWeight: 'bold',
    fontSize: 12,
  },
  portal: {
    position: 'absolute',
    bottom: 120,
    backgroundColor: COLORS.zonePill,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.soulOrb,
  },
  portalText: {
    color: COLORS.soulOrb,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Health Bar - Bottom Center (Orla Spec: 48px from bottom, 200x12px)
  healthBarContainer: {
    position: 'absolute',
    bottom: 48,
    left: SCREEN_WIDTH / 2 - 100,
    alignItems: 'center',
  },
  healthBarBackground: {
    width: 200,
    height: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: 12,
    backgroundColor: COLORS.healthBar,
    borderRadius: 6,
  },
  healthText: {
    color: COLORS.textWhite,
    fontSize: 12,
    marginTop: 4,
  },

  // Touch Controls
  touchControls: {
    position: 'absolute',
    bottom: 120,
    right: 20,
  },
  dpad: {
    alignItems: 'center',
  },
  dpadRow: {
    flexDirection: 'row',
  },
  dpadButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 8,
  },
  dpadText: {
    color: COLORS.textWhite,
    fontSize: 18,
  },
});
