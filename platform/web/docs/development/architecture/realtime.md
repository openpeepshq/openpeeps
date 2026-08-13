# Realtime architecture

OpenPeeps has **no unified app WebSocket bus**. Realtime behaviour is split
across a small set of intentional channels. Prefer the existing channel that
matches the job; do not add a new transport by default.

## Intended stack

| Channel | Transport | Typical use |
| --- | --- | --- |
| **HTTP** | REST (`/api/openpeeps/core/v1/…`) + optional short polling | CRUD, auth, feeds, jam lobby/state snapshots |
| **LiveKit** | WebRTC SFU (out of process) | Jam A/V rooms, in-call data messages, egress/recording |
| **SSE** | Server-Sent Events (`produceStream`) | Short-lived progress / admission streams (media upload, jam waiting room) |
| **BullMQ + Redis hub** | Redis pub/sub + queues | Cross-process domain events and durable background work |
| **Push** | Web Push, APNs, FCM, webhook | Offline / background user alerts |

```
Clients (web / React Native)
  ├── HTTP REST (+ polling where needed)
  ├── SSE (media progress, waiting room, …)
  ├── LiveKit (jams only)
  └── Push (web / APNs / FCM / webhook)

API server (@openpeepshq/server)
  ├── Riddl HTTP handlers → @openpeepshq/core
  ├── SSE endpoints (produceStream)
  └── LiveKit token / room admin APIs

Worker (@openpeepshq/worker)
  ├── BullMQ processors (email, media, notifications, jam recording stop, …)
  └── hub.once / hub.on subscribers (Redis-backed)

Redis
  ├── hub pub/sub (allpeep:core:*)
  ├── BullMQ queues
  └── ad-hoc channels (e.g. media progress)

LiveKit SFU (external)
  └── Rooms named by jam/event id
```

## Channel guide

### HTTP (default)

Almost all product features use request/response HTTP through
`@openpeepshq/client` and React Query-style hooks in `@openpeepshq/react`.

**Also use HTTP polling** when:

- Updates are infrequent or cheap to refetch (jam “is it live?” lists, admin
  diagnostics).
- You need a simple snapshot rather than a continuous stream (jam
  `GET …/jams/:id/state` is polled while a jam UI is open).

Do **not** invent a socket solely to avoid a 1–10s poll.

**Code:** `platform/server/src/api/`, `platform/client/`,
`platform/react/src/contexts/openpeeps/`.

### LiveKit (jams only)

LiveKit is the realtime media plane for **jams** (audio/video, speakers,
recording egress). OpenPeeps issues room tokens and administers rooms via the
LiveKit server SDK; clients join with the LiveKit client SDKs.

Use LiveKit for:

- In-call A/V and LiveKit data packets tied to a jam room.
- Room lifecycle that must stay with the SFU (participants, egress).

Do **not** use LiveKit as a general app event bus (feeds, DMs, notifications,
config). Those stay on HTTP / hub / push.

**Code:** `platform/core/src/jams/` (especially `livekit.ts`, `token.ts`),
jam UI under `platform/react/src/components/jams/`.

### SSE (narrow streams + session foreground channel)

SSE is used for **bounded, session-scoped** streams where the client keeps a
connection open while a specific UI flow — or the authenticated app shell — is
active.

Examples:

- Media attachment processing progress
  (`GET /media/:mediaAttachmentId/progress`).
- Jam waiting-room listen / join streams.
- **Session foreground channel**
  (`GET /profiles/current/session/events`): while signed in, one SSE carries
  invalidate-light envelopes (same logical payload as web push) so badge /
  notification queries update without push permission. Presence
  (`web`/`ios`/`android`) is registered on that connection in Redis
  (`@openpeepshq/core/session`). Catalog stays invalidate-only — not a hub
  mirror.

Implementation: `produceStream` in `platform/server/src/lib/sse.ts`, consumed
via `@openpeepshq/fetch-client` event sources and
`noPayloadStream` / `useSessionEvents` in React.

Use SSE when:

- The client is on-screen for that resource (or the app shell) for seconds to
  minutes / the session.
- Events are a small typed payload stream (progress, admit/deny, invalidate).

Do **not** use SSE for store-and-forward while the browser is closed (use
**push** + in-app notification fetch instead), or auto-forward all hub events.

### BullMQ + Redis hub (server-side realtime)

Domain side effects fan out through `hub` in `platform/core/src/events/`:

1. `hub.emit('postCreated', post)` (and similar typed core events).
2. Redis `PUBLISH` to `allpeep:core:<event>` for live `hub.on` subscribers.
3. Enqueue onto the BullMQ **once** queue so `hub.once` handlers run durably
   on the worker (survive restarts).

Separate BullMQ queues handle email, media processing/transcoding,
notifications, analytics, jam recording auto-stop, etc.
(`platform/worker` boots the workers).

Use the hub / queues when:

- Work must run out-of-band from the HTTP request.
- Multiple processes (API + worker) must react to the same domain event.
- Delivery should be durable (prefer `hub.once` / a dedicated queue over
  in-process `setTimeout`).

Do **not** expose Redis pub/sub directly to browsers. Clients never subscribe
to `allpeep:core:*`.

### Push (offline delivery)

After notifications are created (see
[Notifications](/docs/development/notifications)), delivery can go to:

- **Web Push** (VAPID)
- **APNs** (iOS)
- **FCM** (Android)
- **Webhook** push subscriptions

Push is for alerting users who are not holding an interactive stream. When the
app is open, **session SSE** delivers the same invalidate envelope for in-app
UI updates without requiring push permission.

**Code:** `platform/core/src/notifications/push.ts`, session publish in
`platform/core/src/notifications/jobs.ts` + `platform/core/src/session/`,
subscription types under `platform/core/src/pushSubscriptions/`.

## When **not** to add another channel

Add a new realtime transport only if **none** of the rows above fit. In
particular, do **not**:

1. **Add an app-wide WebSocket** “because everything else does.” HTTP + the
   channels above are the product architecture.
2. **Reuse LiveKit** for non-jam messaging or presence.
3. **Auto-forward all `hub.emit` events** to browsers — expand the session
   catalog only with authz review; prefer invalidate-style envelopes.
4. **Subscribe browsers to Redis** or BullMQ.
5. **Duplicate an existing path** (e.g. a socket that only mirrors what a
   poll or notification already provides).
6. **Use in-process timers** for work that must survive restarts — use
   BullMQ (see jam recording auto-stop) or `hub.once`.

If a feature needs “live enough” UX, try in order: **invalidate/refetch on
user action → short HTTP poll → session/resource SSE → push for offline**.
Escalate only with a clear failure of the previous step.

## Decision cheat sheet

| Need | Prefer |
| --- | --- |
| Create/update/read data | HTTP |
| Slightly stale list/detail while page is open | HTTP polling |
| Upload/transcode progress on one attachment | SSE |
| Waiting-room admit flow | SSE |
| Foreground notification badge/list without push | Session SSE (`invalidate`) |
| Jam A/V and in-room signals | LiveKit |
| Email / heavy media / durable side effects | BullMQ (+ hub) |
| User offline / background alert | Push (+ notification row) |
| Cross-process “something happened” | `hub.emit` / `hub.on` / `hub.once` |

## Related documentation

- [Architecture overview](/docs/development/architecture)
- [Backend architecture](/docs/development/architecture/backend) — hub event
  flow, LiveKit integration notes
- [Notifications](/docs/development/notifications) — in-app, email, and push
- [Data storage](/docs/development/data-storage) — Redis usage
