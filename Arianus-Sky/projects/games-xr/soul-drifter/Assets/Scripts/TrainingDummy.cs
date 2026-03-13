using UnityEngine;

namespace SoulDrifter
{
    /// <summary>
    /// Training Dummy - target for combat practice
    /// Zone C (Training Arena)
    /// </summary>
    public class TrainingDummy : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private int health = 100;
        [SerializeField] private float hitCooldown = 0.5f;
        
        [Header("Visual Feedback")]
        [SerializeField] private Color hitColor = Color.red;
        [SerializeField] private float hitFlashDuration = 0.2f;
        
        private Renderer rend;
        private float lastHitTime;
        private bool isDead;

        private void Start()
        {
            rend = GetComponent<Renderer>();
        }

        private void OnTriggerEnter(Collider other)
        {
            if (isDead) return;
            
            // Check if hit by weapon/attack
            if (other.CompareTag("Weapon") || other.CompareTag("PlayerHand"))
            {
                TakeDamage(10);
            }
        }

        public void TakeDamage(int damage)
        {
            if (isDead || Time.time - lastHitTime < hitCooldown) return;
            
            lastHitTime = Time.time;
            health -= damage;
            
            Debug.Log($"[TrainingDummy] Hit! Health: {health}");
            
            // Flash red
            StartCoroutine(FlashColor());
            
            if (health <= 0)
            {
                Die();
            }
        }

        private System.Collections.IEnumerator FlashColor()
        {
            if (rend == null) yield break;
            
            Color originalColor = rend.material.color;
            rend.material.color = hitColor;
            
            yield return new WaitForSeconds(hitFlashDuration);
            
            rend.material.color = originalColor;
        }

        private void Die()
        {
            isDead = true;
            Debug.Log("[TrainingDummy] Destroyed! +1 Soul");
            
            // Spawn soul collectible
            ZoneManager zoneManager = FindObjectOfType<ZoneManager>();
            if (zoneManager != null)
            {
                // Create soul at dummy position
                GameObject soulPrefab = new GameObject("SoulDrop");
                soulPrefab.transform.position = transform.position + Vector3.up;
                SoulCollectible soul = soulPrefab.AddComponent<SoulCollectible>();
                soulPrefab.AddComponent<SphereCollider>().isTrigger = true;
                soulPrefab.AddComponent<Rigidbody>().isKinematic = true;
            }
            
            Destroy(gameObject);
        }
    }
}
