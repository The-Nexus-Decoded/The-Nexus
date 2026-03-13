using UnityEngine;
using System;

namespace SoulDrifter
{
    /// <summary>
    /// Zone Manager - handles zone transitions A → B → C
    /// Zone A: Spawn Chamber (8x8x6m octagonal)
    /// Zone B: Entry Corridor (10x4x4m)
    /// Zone C: Training Arena (12x12x15m)
    /// </summary>
    public class ZoneManager : MonoBehaviour
    {
        public enum Zone { A, B, C }
        
        [Header("Zone Configuration")]
        [SerializeField] private Zone currentZone = Zone.A;
        [SerializeField] private float autoTransitionDelay = 2f;
        
        [Header("Zone Dimensions")]
        [SerializeField] private Vector3 zoneADimensions = new Vector3(8f, 6f, 8f);  // 8x8x6m
        [SerializeField] private Vector3 zoneBDimensions = new Vector3(10f, 4f, 4f); // 10x4x4m
        [SerializeField] private Vector3 zoneCDimensions = new Vector3(12f, 15f, 12f); // 12x12x15m

        [Header("Events")]
        public Action<Zone> OnZoneChanged;
        public Action<int> OnSoulsCollected;
        
        private int soulsCollected;
        private bool canTransition = true;

        public Zone CurrentZone => currentZone;
        public int SoulsCollected => soulsCollected;

        private void Start()
        {
            Debug.Log($"[ZoneManager] Starting at Zone {currentZone}");
            OnZoneChanged?.Invoke(currentZone);
        }

        public void CollectSoul(int amount)
        {
            soulsCollected += amount;
            Debug.Log($"[ZoneManager] Soul collected! Total: {soulsCollected}");
            OnSoulsCollected?.Invoke(soulsCollected);
        }

        public void TriggerZoneTransition()
        {
            if (!canTransition) return;
            
            canTransition = false;
            
            Zone nextZone = GetNextZone();
            if (nextZone != currentZone)
            {
                Debug.Log($"[ZoneManager] Transitioning from Zone {currentZone} to {nextZone}");
                currentZone = nextZone;
                OnZoneChanged?.Invoke(currentZone);
            }
            
            // Re-enable after delay
            Invoke(nameof(EnableTransition), autoTransitionDelay);
        }

        private Zone GetNextZone()
        {
            return currentZone switch
            {
                Zone.A => Zone.B,
                Zone.B => Zone.C,
                Zone.C => Zone.C, // Final zone
                _ => Zone.A
            };
        }

        private void EnableTransition()
        {
            canTransition = true;
        }

        public Vector3 GetZoneDimensions(Zone zone)
        {
            return zone switch
            {
                Zone.A => zoneADimensions,
                Zone.B => zoneBDimensions,
                Zone.C => zoneCDimensions,
                _ => zoneADimensions
            };
        }

        // Called by thermal trigger in Zone A
        public void OnThermalDiscovery()
        {
            Debug.Log("[ZoneManager] Thermal discovery triggered - Arianus-Sky revealed!");
            // Auto-advance to Zone B after discovery
            Invoke(nameof(TriggerZoneTransition), autoTransitionDelay);
        }
    }
}
