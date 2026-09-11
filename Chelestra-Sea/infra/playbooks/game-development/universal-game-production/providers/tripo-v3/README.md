# Universal Provider Module — Tripo3D v3

## Role

Reusable **3D production** provider adapter for projects that select Tripo in `project-profile.json`.

Default boundary:

- host LLM image generation for concept/reference images;
- Tripo for approved text/image/multiview-to-3D, upload/download, segmentation, mesh completion/decimation, rig checking, rigging and preset animation retargeting;
- Tripo 2D image generation disabled by default unless the project owner explicitly approves an exception.

## Official SDK

JavaScript/TypeScript:

`@vastai/tripo-sdk`

Official repository:

`https://github.com/VAST-AI-Research/tripo-js-sdk`

Global v3 API base:

`https://openapi.tripo3d.ai/v3`

China v3 API base:

`https://openapi.tripo3d.com/v3`

Secret environment variable:

`TRIPO_API_KEY`

Never print or commit the key.

## One-time bootstrap

Run `bootstrap-tripo.ps1` once per workstation/template environment. It installs and locks the official SDK in controlled local storage, performs a no-charge authenticated balance/capability check, and writes a sanitized receipt.

Normal chats load the cached receipt. They do not reinstall the SDK.

## Paid-operation refresh

Before every charged task:

- live balance;
- current price;
- expected/max credits;
- retry-cost disclosure;
- exact owner approval;
- task/cost/download/hash/provenance record.

## CLI and MCP

Do not assume an official CLI exists from a package name. Install a CLI only when current first-party Tripo documentation or the authenticated account identifies the exact package/installer and commands.

The official `tripo-mcp` repository is an optional integration and does not replace SDK/API authentication proof.