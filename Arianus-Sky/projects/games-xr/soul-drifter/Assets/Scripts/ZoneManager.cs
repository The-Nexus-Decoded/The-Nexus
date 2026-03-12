using UnityEngine;
using System;

namespace SoulDrifter
{
    /// <summary>
    /// Manages Zone state machine: A (Spawn) → B (Corridor) → C (Arena)
    /// </summary>
    public class ZoneManager : MonoBehaviour
    {
        public enum ZoneState { ZoneA, ZoneB, ZoneC, Complete }
        
        [Header("Zone Configuration")]
        [SerializeField] private ZoneState currentZone = ZoneState.ZoneA;
        
        [Header("Zone Triggers")]
        [SerializeField] private Collider zoneATrigger;
        [SerializeField] private Collider zoneBTrigger;
        [SerializeField] private Collider zoneCTrigger;

        [Header("Events")]
        public Action<ZoneState> OnZoneChanged;
        public Action OnZoneComplete;

        private void Start()
        {
            // Initialize zone triggers
            if (zoneATrigger != null)
                zoneATrigger.isTrigger = true;
            if (zoneBTrigger != null)
                zoneBTrigger.isTrigger = true;
            if (zoneCTrigger != null)
                zoneCTrigger.isTrigger = true;
            
            Debug.Log($"[ZoneManager] Starting in Zone A");
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player")) return;

            switch (currentZone)
            {
                case ZoneState.ZoneA:
                    if (other == zoneATrigger)
                        TransitionToZone(ZoneState.ZoneB);
                    break;
                    
                case ZoneState.ZoneB:
                    if (other == zoneBTrigger)
                        TransitionToZone(ZoneState.ZoneC);
                    break;
                    
                case ZoneState.ZoneC:
                    if (other == zoneCTrigger)
                    {
                        TransitionToZone(ZoneState.Complete);
                        OnZoneComplete?.Invoke();
                    }
                    break;
            }
        }

        private void TransitionToZone(ZoneState newZone)
        {
            ZoneState oldZone = currentZone;
            currentZone = newZone;
            
            Debug.Log($"[ZoneManager] {oldZone} → {newZone}");
            OnZoneChanged?.Invoke(newZone);
        }

        public ZoneState GetCurrentZone() => currentZone;
    }
}
