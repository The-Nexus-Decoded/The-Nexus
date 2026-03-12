# XR Spatial Resolver V2 Spec

**Version:** 2.0-draft  
**Status:** Pending  
**Owner:** Samah (Spatial)  
**Reference:** V1 Contract (XR-Gesture-Resolver-Contract.md)

---

## V2: Depth Scaling & Reference Distance

### Reference Distance

The reference distance defines the "neutral" depth plane where gestures feel 1:1 with hand movement.

- **Default:** 1.0m (arm's length)
- **Range:** 0.5m – 2.0m (configurable per experience)
- **Use case:** Gesture magnitude at reference distance = world-space magnitude

### Linear Depth Scaling

Beyond reference distance, gesture magnitude scales linearly:

```
worldMagnitude = gestureMagnitude * (actualDistance / referenceDistance)
```

**Example:**
- Reference: 1.0m
- Object at: 2.0m
- User hand movement: 10cm
- Resulting world movement: 10cm * (2.0 / 1.0) = 20cm

### Rationale

- Maintains 1:1 feel at arm's length (most natural)
- Linear falloff prevents overshoot at distance
- Simple math, fast to compute per-frame

---

## V2 Roadmap

- [ ] Reference distance config per experience type
- [ ] Depth-aware gesture magnitude scaling
- [ ] Haptic feedback calibrated to depth
- [ ] Accessibility: configurable scaling curves

---

*V2 spec — building on V1 baseline.*
