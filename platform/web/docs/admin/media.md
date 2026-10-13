# Media Management

OpenPeeps stores uploaded files (images, video, audio, documents) as
content-addressed SHA-256 blobs on the local filesystem under
`/storage/allpeep/<id>/<filename>`. Each file is referenced by URL fragments
embedded in the JSONB `body` columns of posts, profiles, groups, configs, and
jam recordings. The media-management tools let administrators inspect which
files are still in use and reclaim disk space from orphaned files.

<div style="height:20px"></div>

## Admin UI

Owners and administrators with the appropriate capabilities can manage media at
**Administration → Media** (`/admin/media`).

| Action     | Capability          |
| ---------- | ------------------- |
| List       | `core-media-read`   |
| Delete now | `core-media-delete` |

The list shows every file on disk, its size, last-modified time, and a
**reference status**:

| Status                       | Meaning                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| **In use**                   | The file is referenced by at least one live post, profile, page, or recording.     |
| **Unused**                   | No live reference was found; the file is a candidate for garbage collection.       |
| **Ready to collect**         | Unreferenced for longer than the grace period; will be deleted on the next GC run. |
| **Recorded on the next run** | The file has not yet been seen by a GC collection run.                             |

**Delete now** removes a file immediately from disk. This bypasses the grace
period. If the file is still linked from a post, page, or profile, those links
will return a 404 after deletion — the references themselves are not rewritten.
The UI shows a confirmation dialog with the specific warning when you delete a
file that is still in use.

Files that are unreferenced but within the grace window are deleted
automatically by the daily garbage-collection job (see below).

<div style="height:20px"></div>

## How reference scanning works

The garbage collector scans **every JSONB column** in the public schema for URL
fragments matching `/allpeep/<id>/` (stored files) and `/media/streaming/<id>/`
(HLS stream caches). This covers:

- **Posts** — attachment `url` and `previewUrl` fields in the post body
- **Profiles** — avatar, header, bio, and custom-field image URLs
- **Groups** — avatar and header image URLs
- **Configs** — welcome page, about page, and code-of-conduct content (which may embed media)
- **Jam recordings** — attachment URLs for recorded jams

Soft-deleted rows (tables with a `deleted_at` column) are excluded from the
scan, so a deleted post no longer counts as a live reference. The `entries` edge
table is also excluded — it snapshots post bodies at create/edit time and would
keep deleted posts' media alive forever.

The `media_attachments` table (the upload registry) is handled separately: rows
whose files are all gone from disk are cleaned up as dangling attachments.

<div style="height:20px"></div>

## Garbage collection

A daily BullMQ job (`media-garbage-collection`) runs at 04:30 UTC and performs
these steps:

1. **Scan**: Queries all JSONB columns for live storage IDs.
2. **Mark**: Any file on disk with no live reference gets a timestamp in
   `gc-unreferenced.json`. In-progress uploads (`.tmp-*` files) that haven't
   been linked yet survive the same window.
3. **Sweep**: Files whose unreferenced timestamp is older than the grace period
   (7 days by default) are deleted from disk. Their HLS cache directories and
   stale attachment-registry rows are cleaned up too.

**Crash-safety**: The GC clock state is persisted _before_ any files are
unlinked, so a crash mid-sweep does not cause a re-linked file to be treated as
long-unreferenced on the next run.

**HLS preservation**: Before deleting an HLS directory, the GC checks the
Redis-recorded last-access time. If the stream was accessed within the last
10 minutes (someone may be actively watching), the directory is preserved and
will be reclaimed by the streaming-cleanup job once genuinely idle.

<div style="height:20px"></div>

## What happens when a referenced file is deleted

| Path                      | Behavior                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Delete now** (admin UI) | File removed from disk immediately. URLs in posts/pages/etc. remain as text but return 404 when fetched. The upload-registry row is cleaned up only if _all_ files it referenced are now gone. |
| **Garbage collection**    | Only deletes files with no live DB reference for 7+ days. Linked files are never touched.                                                                                                      |

Neither path rewrites URLs in existing content. If a media file is deleted
while still linked from a post or page, the broken reference will appear as a
missing image or failed video/audio playback until the content is edited.

<div style="height:20px"></div>

## Storage layout

Files are stored content-addressed (SHA-256, base64url) under the configured
media storage directory:

```
<storage.path>/
├── allpeep/          # source files, named by content hash
│   ├── <sha256-id>   # the actual media blob
│   └── .tmp-*        # in-progress uploads (cleaned up by GC)
└── hls/             # HLS VOD stream caches, named by source hash
    └── <sha256-id>/
        ├── hls.m3u8
        └── seg-*.ts
```

`gc-unreferenced.json` lives in the storage root and tracks the "unreferenced
since" timestamp for each file pending collection.

<div style="height:20px"></div>

## Related documentation

- [Backups](/docs/admin/backups) — media is included in backup archives
- [Data storage](/docs/development/data-storage) — PostgreSQL schema overview
- [Roles and Capabilities](/docs/admin/roles) — default capabilities for admin/moderator/member
