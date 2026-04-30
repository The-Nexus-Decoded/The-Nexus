# Anewluv Photo Moderation — Read-Only Worker Contract

Date: 2026-04-30  
Mode: contract note only. No live writes, no endpoint invention, no credentials, no image content committed.

## Locked worker boundary

```text
READ:  GET /photos/queue
INPUT: pending Photos rows; PhotoUrl / PhotoData only
AI:    openclaw infer image describe --model minimax/MiniMax-VL-01 --file <local-temp-file> --json
OUTPUT: normalized recommendation JSON + sanitized dry-run report
WRITE: none
```

Worker does not upload, trigger uploads, decide final moderation state, mutate Xano, or call provider APIs directly.

`POST /photos/decide` is documentation-only for now and remains gated until Lord Xar explicitly approves live writes.

## Known source table / queue

Existing queue endpoint discovered through Xano metadata:

```text
GET /photos/queue
```

Queue source:

```text
Photos where photostatus_id = 1 AND deleted = false
ordered by created_at ASC
```

The backing table is:

```text
Xano table: Photos
Xano table id: 12
Physical table in XanoScript: x1_12
```

## Redacted queue response shape

The queue response shape is:

```json
{
  "items": [
    {
      "id": 123,
      "users_id": 456,
      "photo_url": "/vault/.../image.jpg",
      "photostatus_id": 1,
      "gallery": true,
      "created_at": 1770000000000,
      "user_name": "[REDACTED]",
      "user_email": "[REDACTED]"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 50
}
```

Worker logs and Discord/Jarvis reports must not print raw queue payloads because the queue includes `user_name` and `user_email`.

## Image reference fields

Available photo fields from `Photos`:

```text
id
users_id
PhotoUrl        # vault-relative path
PhotoData       # Xano image object
Description
UploadDate
photostatus_id
Gallery
size
ImageHash
deleted
deleted_on
ai_verdict
ai_confidence
ai_reason_code
ai_note
review_type_id
```

`PhotoData` shape observed from the existing public photos projection:

```json
{
  "access": "public",
  "path": "/vault/.../image.jpg",
  "name": "image.jpg",
  "type": "image",
  "size": 516418,
  "mime": "image/jpeg",
  "meta": { "width": 1242, "height": 2208 },
  "url": "https://xvlh-aq5j-qiqk.n7d.xano.io/vault/.../image.jpg"
}
```

Read-only fetch probe result:

- `HEAD` is not accepted by the Xano vault URL (`405 Method Not Allowed`).
- `GET` with `Range: bytes=0-31` succeeds (`206`) for both:
  - `PhotoData.url`
  - `https://xvlh-aq5j-qiqk.n7d.xano.io` + `PhotoUrl`

Worker should prefer `PhotoData.url` when present, and fall back to base URL + `PhotoUrl`.

## Existing status values

`PhotoStatus` rows discovered:

```text
1 = Uploaded
2 = Approved
3 = Dissaproved  # misspelled in real data
```

Live read-only public projection sample on 2026-04-30:

```text
public rows visible: 4835
photostatus_id counts: 0=4, 1=41, 2=4778, 3=12
non-null ai_verdict rows visible: 0
```

Status `1` is the moderation queue target.

## Existing AI / review fields

Existing `Photos` fields that may support future recommendation state if writes are separately approved:

```text
ai_verdict
ai_confidence
ai_reason_code
ai_note
review_type_id
```

Existing `photo_review_type` rows:

```text
1 = Agent
2 = Human
```

Under the current locked contract, the worker must not write these fields. It may include equivalent values in the dry-run report only.

## Required ID field for final decision endpoint

Existing final decision endpoint:

```text
POST /photos/decide
```

Required photo identifier:

```text
photo_id = Photos.id
```

Expected decision payload shape, for documentation only:

```json
{
  "actor_key": "[REDACTED]",
  "actor_type": "admin",
  "photo_id": 123,
  "decision": "approved",
  "reject_reason_code": null,
  "note": null
}
```

Rejected shape:

```json
{
  "actor_key": "[REDACTED]",
  "actor_type": "admin",
  "photo_id": 123,
  "decision": "rejected",
  "reject_reason_code": "inappropriate_photos",
  "note": "[human/admin note]"
}
```

Current implementation requires `actor_type == "admin"` for final photo decisions. The worker must not impersonate admin and must not call this endpoint until live writes are explicitly approved.

## Required read-only auth scope, redacted

`GET /photos/queue` requires:

```text
users JWT auth
actor_key service validation
actor_type in ai_agent | admin | system
```

Current blocker for real queue runtime call:

```text
No approved worker JWT/service-account auth path has been provided in this shell.
```

The worker can use fixtures shaped like the redacted queue response until the approved read-only auth path is supplied.

## Known / unknown

Known:

- Queue/source endpoint: `GET /photos/queue`.
- Source table: `Photos` / `x1_12`.
- Pending status: `photostatus_id = 1` and `deleted = false`.
- Image reference candidates: `PhotoData.url`, `PhotoUrl`.
- `PhotoData.url` and base + `PhotoUrl` are byte-fetchable via `GET` range probe on public sample rows.
- Final decision ID field: `photo_id = Photos.id`.
- Existing final decision endpoint writes status and notes, but is gated off for the worker.

Unknown / not yet proven:

- Exact binary storage ownership beyond Xano vault URL shape.
- Full upload path implementation inside Xano that populates `PhotoUrl` / `PhotoData`.
- Whether every queued item has `PhotoData.url` or some only expose `PhotoUrl`.
- Approved service-account/JWT path for read-only queue calls.
- Whether admin UI surfaces `Photos.ai_*` fields today.

## Next safe implementation target

Wire the worker proof against a fixture matching the real queue shape:

```text
queue item id -> image ref -> temp file -> MiniMax-VL CLI describe -> parser -> recommendation JSON -> sanitized report
```

No Xano writes. No upload path. No final decisions.
