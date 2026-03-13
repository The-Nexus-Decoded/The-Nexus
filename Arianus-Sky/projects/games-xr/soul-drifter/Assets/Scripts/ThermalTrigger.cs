using UnityEngine;

namespace SoulDrifter
{
    /// <summary>
    /// Thermal Discovery Trigger - detects player proximity in Zone A
    /// Triggers at 2m distance from center
    /// </summary>
    public class ThermalTrigger : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private float triggerRadius = 2f;
        [SerializeField] private LayerMask playerLayer;
        
        [Header("References")]
        [SerializeField] private ZoneManager zoneManager;
        [SerializeField] private GameObject thermalVisual; // Glowing sphere
        
        private bool hasTriggered;
        private Transform playerTransform;

        private void Start()
        {
            // Auto-find player if not assigned
            if (zoneManager == null)
                zoneManager = FindObjectOfType<ZoneManager>();
            
            if (playerLayer == 0)
                playerLayer = LayerMask.GetMask("Player");
        }

        private void Update()
        {
            if (hasTriggered) return;
            
            CheckPlayerProximity();
        }

        private void CheckPlayerProximity()
        {
            // Find player if not cached
            if (playerTransform == null)
            {
                GameObject player = GameObject.FindGameObjectWithTag("Player");
                if (player != null)
                    playerTransform = player.transform;
            }
            
            if (playerTransform == null) return;
            
            float distance = Vector3.Distance(transform.position, playerTransform.position);
            
            if (distance <= triggerRadius)
            {
                TriggerDiscovery();
            }
        }

        private void TriggerDiscovery()
        {
            hasTriggered = true;
            Debug.Log("[ThermalTrigger] ARIANUS-SKY DISCOVERED!");
            
            // Notify zone manager
            zoneManager?.OnThermalDiscovery();
            
            // Visual feedback - disable thermal sphere after discovery
            if (thermalVisual != null)
            {
                thermalVisual.SetActive(false);
            }
            
            // Optional: Play sound effect
            // AudioSource.PlayClipAtPoint(discoverySound, transform.position);
        }

        private void OnDrawGizmosSelected()
        {
            // Visualize trigger radius in editor
            Gizmos.color = new Color(1f, 0.5f, 0f, 0.5f);
            Gizmos.DrawWireSphere(transform.position, triggerRadius);
        }
    }
}
