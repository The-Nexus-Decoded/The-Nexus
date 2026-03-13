using UnityEngine;
using UnityEngine.XR;
using System.Collections.Generic;

namespace SoulDrifter
{
    /// <summary>
    /// VR Player Controller - locomotion, interaction, soul collection
    /// Target: Quest 2 standalone (60fps)
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
        
        // Input cache
        private Vector2 leftThumbstick = Vector2.zero;
        private bool rightTriggerPressed;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            if (characterController == null)
                characterController = gameObject.AddComponent<CharacterController>();
            
            characterController.height = 1.7f;
            characterController.radius = 0.3f;
            characterController.center = new Vector3(0, 0.85f, 0);
            characterController.slopeLimit = 45f;
            characterController.stepOffset = 0.3f;
        }

        private void Update()
        {
            UpdateInput();
            HandleMovement();
        }

        private void UpdateInput()
        {
            // Cache thumbstick input - avoid GetComponent in Update
            InputDevice leftHand = InputDevices.GetDeviceAtXRNode(XRNode.LeftHand);
            leftHand.TryGetFeatureValue(CommonUsages.primary2DAxis, out leftThumbstick);
            
            // Sprint: grip button
            InputDevice leftHandGrip = InputDevices.GetDeviceAtXRNode(XRNode.LeftHand);
            leftHandGrip.TryGetFeatureValue(CommonUsages.gripButton, out isSprinting);
            
            // Right trigger for interaction
            InputDevice rightHand = InputDevices.GetDeviceAtXRNode(XRNode.RightHand);
            rightHand.TryGetFeatureValue(CommonUsages.triggerButton, out rightTriggerPressed);
        }

        private void HandleMovement()
        {
            if (leftThumbstick.magnitude > 0.1f)
            {
                Vector3 forward = headTransform.forward;
                Vector3 right = headTransform.right;
                
                forward.y = 0;
                right.y = 0;
                forward.Normalize();
                right.Normalize();

                Vector3 move = (forward * leftThumbstick.y + right * leftThumbstick.x) * moveSpeed;
                
                if (isSprinting)
                    move *= sprintMultiplier;

                move.y = -9.81f; // Gravity
                characterController.Move(move * Time.deltaTime);
            }
        }

        public void OnSoulCollected(int amount)
        {
            // Trigger haptic feedback
            InputDevice rightHand = InputDevices.GetDeviceAtXRNode(XRNode.RightHand);
            HapticCapabilities capabilities;
            if (rightHand.TryGetHapticCapabilities(out capabilities))
            {
                if (capabilities.supportsImpulse)
                {
                    rightHand.SendHapticImpulse(0, 0.5f, 0.1f);
                }
            }
        }
    }
}
