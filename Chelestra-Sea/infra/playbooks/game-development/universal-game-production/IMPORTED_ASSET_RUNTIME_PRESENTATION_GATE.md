# Imported Asset Runtime Presentation Gate

Use this gate for every imported 3D asset and every zone that stages one. It proves that the reviewed source asset survives optimization, fitting, orientation, assembly and runtime placement without losing its authored identity or function.

Complete the machine-readable [presentation record](templates/imported-asset-runtime-presentation-record.template.json) before the asset or containing zone can be accepted.

## Hard-stop rule

`PASS` is required before zone acceptance. Missing source/runtime comparison, missing required views, an unexplained presentation mismatch or an unresolved assembly intersection is `BLOCKED`, not a cosmetic follow-up. A waiver is valid only when it names the exact failed field, reason, scope, owner approval and approval evidence.

## 1. Lock the presentation contract

Record before fitting or placement:

- source units, axes and local bounds;
- source forward/up/right axes;
- source-to-destination traversal tangent;
- upstream presentation normal at the placement;
- decorated or interactive face normal;
- intended runtime-facing normal and the transform that maps source space to it.

The decorated/interactive face must face the intended upstream approach unless the design explicitly says otherwise. Do not infer the authored front from a generic bounding box.

## 2. Compare reviewed source and runtime derivative

Identify both artifacts by stable path/URI, version and hash. Compare:

- geometry counts, dimensions and aspect ratios;
- materials, PBR bindings, texture identities and texture resolutions;
- named critical features such as handles, hinges, locks, controls, emblems or readable faces;
- source and optimized-runtime close-range renders under comparable neutral lighting.

Optimization may reduce cost, but it may not silently remove, flatten, recolor, mirror or obscure a critical feature. Preserve the reviewed source artifact and record every derived runtime artifact.

## 3. Preserve authored proportions

Fit with a uniform scale that preserves the source aspect ratios. Nonuniform scaling is a failure unless a documented, owner-approved exception records the exact axes, ratios, visual impact and reason. The approved exception must be present in the presentation record before acceptance.

## 4. Separate moving and structural ownership

For doors, gates and other controlled thresholds, record separate owners for the moving leaf and static frame. The frame owns jambs, lintel and surrounding structure; the leaf owns its pivot, visible hardware, moving render mesh and moving collider. Collision, animation and rendering must use the same measured fitted bounds and orientation contract.

Test every production state, including the complete swept motion. There must be zero leaf/frame, leaf/jamb or leaf/lintel intersections in closed, intermediate and open states. An open threshold must expose its required clear passage without leaving a hidden blocker.

## 5. Required visual evidence

Capture close-range runtime views from front, back, left and right. Also capture the intended upstream approach and the complete controlled-state proof: closed, representative intermediate sweep and open. Include the reviewed source comparison views.

The evidence must prove:

- the decorated/interactive face is presented to the intended approach;
- handles, hinges and all declared critical hardware are present and readable;
- the asset is not cropped, buried, mirrored, recolored or stretched;
- the moving leaf and static frame remain visually and physically coherent in every state;
- the open state provides the contracted clearance.

Wide topology or navigation images do not satisfy this close-range presentation gate.

## 6. Record and verification

The presentation record must contain machine-readable `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN` or approved-waiver fields for orientation, geometry, texture/material fidelity, critical features, aspect preservation, assembly ownership, state intersections, evidence completeness and final acceptance.

The producer may report `IMPLEMENTED_UNVERIFIED`; an independent verifier reopens the source and runtime artifacts, re-runs state checks and records the final result. Any later change to the source, optimizer, transform, frame, collider, animation or placement reopens this gate and dependent zone gates.
