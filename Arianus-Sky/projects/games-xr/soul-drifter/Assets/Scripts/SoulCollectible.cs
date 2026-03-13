using UnityEngine;

namespace SoulDrifter
{
    /// <summary>
    /// Soul Collectible - interactable soul orb
    /// </summary>
    public class SoulCollectible : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private int soulValue = 1;
        [SerializeField] private float rotationSpeed = 45f;
        [SerializeField] private float bobAmplitude = 0.1f;
        [SerializeField] private float bobFrequency = 1f;
        
        [Header("Visual")]
        [SerializeField] private Color soulColor = new Color(0.5f, 0.8f, 1f, 1f);
        
        private Vector3 initialPosition;
        private bool isCollected;
        private Renderer rend;

        private void Start()
        {
            initialPosition = transform.position;
            rend = GetComponent<Renderer>();
            
            if (rend != null)
            {
                rend.material.color = soulColor;
                rend.material.EnableKeyword("_EMISSION");
                rend.material.SetColor("_EmissionColor", soulColor * 0.5f);
            }
        }

        private void Update()
        {
            if (isCollected) return;
            
            // Rotate
            transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime);
            
            // Bob
            float bob = Mathf.Sin(Time.time * bobFrequency) * bobAmplitude;
            transform.position = initialPosition + Vector3.up * bob;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (isCollected) return;
            
            if (other.CompareTag("Player"))
            {
                Collect(other.gameObject);
            }
        }

        private void Collect(GameObject player)
        {
            isCollected = true;
            
            // Find ZoneManager and add soul
            ZoneManager zoneManager = FindObjectOfType<ZoneManager>();
            zoneManager?.CollectSoul(soulValue);
            
            // Visual feedback
            Debug.Log($"[SoulCollectible] Collected {soulValue} soul(s)!");
            
            // Destroy or disable
            gameObject.SetActive(false);
            Destroy(gameObject, 0.1f);
        }
    }
}
