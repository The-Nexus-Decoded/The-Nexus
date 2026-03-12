using UnityEngine;
using UnityEngine.XR;

namespace SoulDrifter
{
    /// <summary>
    /// VR Player controller - handles locomotion and interaction
    /// Target: Quest 2 standalone (60fps minimum)
    /// </summary>
    public class VRPlayerController : MonoBehaviour
    {
        [Header("Locomotion")]
        [SerializeField] private float moveSpeed = 2.5f;
        [SerializeField] private float sprintMultiplier = 1.5f;
        
        [Header("References")]
        [SerializeField] private Transform headTransform;
        [SerializeField] private Transform leftHandTransform;
        [SerializeField] private Transform rightHandTransform;

        private CharacterController characterController;
        private bool isSprinting;
        private Vector3 moveDirection;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            if (characterController == null)
                characterController = gameObject.AddComponent<CharacterController>();
            
            characterController.height = 1.7f;
            characterController.radius = 0.3f;
            characterController.center = new Vector3(0, 0.85f, 0);
        }

        private void Update()
        {
            HandleMovement();
            HandleInteraction();
        }

        private void HandleMovement()
        {
            // Thumbstick movement relative to head direction
            Vector2 thumbstickInput = GetThumbstickInput();
            
            if (thumbstickInput.magnitude > 0.1f)
            {
                Vector3 forward = headTransform.forward;
                Vector3 right = headTransform.right;
                
                // Flatten to XZ plane
                forward.y = 0;
                right.y = 0;
                forward.Normalize();
                right.Normalize();

                Vector3 move = (forward * thumbstickInput.y + right * thumbstickInput.x) * moveSpeed;
                
                if (isSprinting)
                    move *= sprintMultiplier;

                // Apply gravity
                move.y = -9.81f;
                
                characterController.Move(move * Time.deltaTime);
            }
        }

        private Vector2 GetThumbstickInput()
        {
            Vector2 input = Vector2.zero;
            
            // Left thumbstick for movement
            InputDevice leftHand = InputDevices.GetDeviceAtXRNode(XRNode.LeftHand);
            leftHand.TryGetFeatureValue(CommonUsages.primary2DAxis, out input);
            
            return input;
        }

        private void HandleInteraction()
        {
            // Right hand trigger for interaction (soul collection, combat)
            InputDevice rightHand = InputDevices.GetDeviceAtXRNode(XRNode.RightHand);
            
            if (rightHand.TryGetFeatureValue(CommonUsages.triggerButton, out bool triggerPressed) && triggerPressed)
            {
                PerformInteraction();
            }
        }

        private void PerformInteraction()
        {
            // Raycast from right hand to detect interactables
            Ray ray = new Ray(rightHandTransform.position, rightHandTransform.forward);
            
            if (Physics.Raycast(ray, out RaycastHit hit, 10f))
            {
                IInteractable interactable = hit.collider.GetComponent<IInteractable>();
                interactable?.OnInteract(gameObject);
            }
        }

        public void SetSprinting(bool sprinting)
        {
            isSprinting = sprinting;
        }
    }

    public interface IInteractable
    {
        void OnInteract(GameObject player);
    }
}
