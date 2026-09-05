# Universal Provider Module — Tripo3D v3

## Role boundary

This module treats Tripo as a **3D production provider**, not the default concept-image provider.

### Concept/reference images

Use the active host LLM's image generator first when available.

Do not spend Tripo credits on text-to-image, image-to-image, or image-to-multiview during normal production unless the project overlay records a specific exception and exact owner-approved cost.

### Tripo 3D stages

Use Tripo, as selected by the project profile, for:

- text-to-3D;
- image-to-3D;
- multiview-to-3D;
- external model upload/import;
- retexturing/stylization where approved;
- mesh segmentation;
- mesh completion;
- smart low-poly/decimation;
- model conversion;
- rig compatibility check;
- automatic rigging/skinning;
- preset animation retargeting;
- any first-party custom-motion capability that is actually verified against the authenticated account;
- task polling and controlled immediate downloads.

Geometry-changing operations occur before final rigging/animation.

## Official connection lane

Preferred JavaScript/TypeScript SDK:

```text
@vastai/tripo-sdk
```

Official repository:

```text
VAST-AI-Research/tripo-js-sdk
```

Global v3 API base:

```text
https://openapi.tripo3d.ai/v3
```

China v3 API base:

```text
https://openapi.tripo3d.com/v3
```

The SDK requires Node.js 18 or later and reads `TRIPO_API_KEY` from the environment by default.

The official Python SDK is also acceptable:

```text
tripo3d
```

## Connection proof

Tripo is not considered connected until the selected SDK lane performs a live, read-only authenticated call, preferably account balance, and stores a sanitized receipt containing:

- receipt ID and timestamp;
- SDK package and version;
- base URL/region;
- secret present yes/no—never the value;
- authenticated read PASS/FAIL;
- balance read PASS/FAIL;
- required capability methods;
- controlled staging/download paths;
- no charged task submitted.

The receipt is cached outside Git and reused by future chats through `SESSION_FAST_START.md`.

## CLI rule

Do not install a package merely because it is named `tripo-cli`.

An official CLI may be added only when current first-party Tripo documentation or the authenticated console identifies:

- exact package/repository/installer;
- publisher/organization;
- version;
- checksum/signature where available;
- version/authentication/health commands;
- supported capabilities and pricing behavior.

Until then, the official SDK/API lane is sufficient and authoritative.

## MCP rule

The official `VAST-AI-Research/tripo-mcp` integration is optional and currently documented as an alpha Blender-add-on workflow.

Use it only when the project profile selects it and the complete Blender/add-on/MCP chain passes tool-discovery and no-charge connection checks.

MCP failure does not block the official SDK/API lane.

## Output ownership

Provider output URLs are temporary. Download accepted task output immediately into controlled project staging, then record:

- task ID;
- operation/model/version;
- input prompt/reference hashes;
- expected, maximum and actual cost;
- untouched download path/hash;
- derivative paths/hashes;
- license/provenance;
- review state;
- runtime promotion state;
- rollback path.

A temporary provider URL is never the canonical game asset.

## Paid-operation gate

Immediately before each charged task:

1. refresh authenticated balance;
2. read current official pricing;
3. state exact operation and model/version;
4. state expected and maximum credits;
5. disclose retry cost;
6. receive explicit owner approval;
7. submit only that approved task;
8. record actual cost and remaining balance.

A project-level decision to “use Tripo” is not blanket spend approval.

## Animation routing

Tripo is the primary auto-rig and preset-retarget lane when selected.

For every requested motion:

1. query the live preset library and rig version;
2. use a matching preset directly when it passes;
3. use a preset as the common base for DCC-derived variants when helpful;
4. verify any first-party custom-motion feature before relying on it;
5. route custom motions through the project's animation-bakeoff policy when presets are insufficient.

Do not claim arbitrary text-to-animation support unless authenticated first-party capability proof establishes it.

## Example module status

```json
{
  "module": "provider.tripo-v3",
  "status": "CACHED_PASS",
  "receiptId": "",
  "sdk": "@vastai/tripo-sdk",
  "sdkVersion": "",
  "baseUrl": "https://openapi.tripo3d.ai/v3",
  "secretEnvironmentVariable": "TRIPO_API_KEY",
  "hostLlmImageGenerationPreferred": true,
  "tripo2DImageGenerationDefault": "DISABLED",
  "paidOperationRequiresLiveRefreshAndOwnerApproval": true
}
```
