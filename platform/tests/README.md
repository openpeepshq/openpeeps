# Integration tests (`@openpeeps/tests`)

Postgres-native Playwright suites that run against a Compose stack (or Forgejo
CI services). Each suite is a Playwright **project** and is intended to run in
isolation (its own DB / Compose project / CI job).

| Suite | Seed | Always? |
|-------|------|---------|
| `empty` | Cleared DB + owner bootstrap | Yes |
| `default` | `fixtures/backups/default-install.zip` | Yes |
| `public` | `fixtures/backups/public-community.zip` | Yes |
| `sso` | Empty DB + OIDC mock (`oauth` Compose profile) | Yes |
| `jams` | Empty DB + real LiveKit | Only with real `JAMS_LIVEKIT_*` |

## Local (against a running stack)

```bash
# From repo root — clear DB then run empty suite
pnpm --filter @openpeeps/tests run test:integration

# Single suite
pnpm --filter @openpeeps/tests run test:integration:empty
pnpm --filter @openpeeps/tests run test:integration:default
pnpm --filter @openpeeps/tests run test:integration:public
pnpm --filter @openpeeps/tests run test:integration:sso
pnpm --filter @openpeeps/tests run test:integration:jams
```

## Docker Compose (full stack)

```bash
cd platform/tests
pnpm run integration:empty
pnpm run integration:default
pnpm run integration:public
pnpm run integration:sso      # includes mock OIDC
pnpm run integration:jams     # skips tests unless LiveKit secrets are set
pnpm run integration:down
```

Compose services: Postgres, Redis, Mailpit, push-catcher, web, worker, optional
oauth (SSO). Backup suites restore fixtures via a one-shot `restore` service
before web starts.

Env of note:

- `EMAIL_CONFIG_SECURE=false`, `EMAIL_CONFIG_HOST=mailpit`, port `1025`
- `MAILPIT_URL` (HTTP API on `8025`) for assertions
- `PUSH_CATCHER_URL=http://pushcatcher:8099` for webhook push assertions
- `DISABLE_CONFIG_CACHE=true` so restores are visible without process restart
- `JAMS_LIVEKIT_URL` / `JAMS_LIVEKIT_API_KEY` / `JAMS_LIVEKIT_API_SECRET` —
  must be real credentials (not `APIxxxxxxxxxxxx` placeholders) for the jams
  suite

## Jam load test (manual)

Node harness that joins a jam as **N publishers** (default 100), holds audio for
**5 minutes**, and sends in-jam messages/reactions at up to **100/min**, asserting
peers receive them within **1s** over LiveKit data channels.

Only needs an OpenPeeps API root. LiveKit URL + participant JWTs come from
`GET /api/openpeeps/core/v1/jams/{eventId}/token` (the target instance must have
LiveKit configured server-side). No local `JAMS_LIVEKIT_*` env vars.

```bash
export LOADTEST_BASE_URL=https://your.openpeeps.instance
# optional: LOADTEST_TOKEN=<moderator JWT>, LOADTEST_PARTICIPANTS=100,
# LOADTEST_DURATION_SEC=300, LOADTEST_EVENTS_PER_MIN=100

pnpm --filter @openpeeps/tests run loadtest:jam
```

Uses `@livekit/rtc-node` (not Playwright). Writes JSON reports to
`platform/tests/.loadtest-results/` (gitignored). Not run on every PR — manual
or scheduled. All participants publish (matches `video-call` token grants).
Chat/reactions mirror the app: REST persist then lossy `publishData`.

## Fixtures

Synthetic backups are derived from `platform/web/public/template/test-backup.zip`
(Arango JSONL, restorable into Postgres):

```bash
pnpm --filter @openpeeps/tests run fixtures:generate-backups
```

## Layout

```
platform/tests/
  docker-compose.integration.yml
  playwright.config.ts          # multi-project
  helpers/                      # mailpit, pushCatcher, api, backup, wait
  fixtures/backups/
  suites/{empty,default,public,sso,jams}/
  suites/*/seed.setup.ts        # Playwright setup project (runs before suite)
  scripts/jam-loadtest.mjs          # manual jam SFU + chat load harness
```

---

## Tested flows by suite

Depth legend:

- **API** — asserts real HTTP mutations / responses
- **UI** — drives the browser; depth noted per flow
- **Mailpit** — asserts outbound email
- **Webhook** — asserts push delivery

### `empty` — cleared DB + owner bootstrap

Setup (`seed.setup.ts`): registers `test@test.com` / `@test` as the first
account (community owner) before tests run.

#### Auth & accounts

| Flow | Depth | Where |
|------|-------|-------|
| OpenAPI spec loads (`/openapi.json`) | API | `api/test.ts` |
| Register new user | API | `api/.../auth/test.ts` |
| Registration form renders | UI (smoke) | `auth/register/test.ts` |
| Login → usable token → `profiles/current` | API | `user-actions/` |
| Login form → feed / welcome | UI | `user-actions/` |
| Logout (clear credentials → login page) | UI (smoke) | `ui/` (`logout`) |
| Token-injected “logged in” feed | UI (smoke) | `ui/` (`login`) |
| Signup via register UI | UI | `ui/` (`signup`) |
| Password reset (request → Mailpit link → new password → login) | API + Mailpit | `user-actions/` |
| Email validation (request → Mailpit → validate → can create posts) | API + Mailpit | `user-actions/` |

#### Email & push plumbing

| Flow | Depth | Where |
|------|-------|-------|
| Admin diagnostics test email delivered | API + Mailpit | `email-push/` |
| Webhook push subscription + test push received | API + Webhook | `email-push/` |

#### Posts

| Flow | Depth | Where |
|------|-------|-------|
| Create note on local feed | UI | `ui/` (`createPost`) |
| Create note with hashtag / @mention text | UI | `ui/` (`createPostWithHashtag`, `createPostWithMention`) |
| Create second post (named “edit” in UI suite — does not PUT) | UI (smoke) | `ui/` (`createPostAndEdit`) |
| Open poll composer (does not publish) | UI (smoke) | `ui/` (`createPoll`) |
| Repost button visible after create | UI (smoke) | `ui/` (`repost`) |
| Reply to note → list replies | API | `user-actions/` |
| React 👍 / unreact | API | `user-actions/` |
| Bookmark → bookmarks feed | API | `user-actions/` |
| Edit note (PUT) / delete note | API | `user-actions/` |

#### Groups

| Flow | Depth | Where |
|------|-------|-------|
| Create group (simple) | UI | `ui/` (`createGroupSimple`) |
| Create group with description, rules, admins-only events | UI | `ui/` (`createDetailedGroup`) |
| Create group with markdown description | UI | `ui/` (`createGroupWithMarkdown`) |
| Duplicate group handle rejected | UI | `ui/` (`duplicateGroupHandle`) |
| Group visibility / description tab | UI (smoke) | `ui/` (`groupVisibility`) |
| Open created group by handle | UI | `ui/` (`groupSearch`) |
| Create group → create event on group | UI | `ui/` (`createGroupAndEvent`) |
| Join group → members list → leave | API | `user-actions/` |
| Regular member can open groups/events pages | UI (smoke) | `ui/` (`regularMemberRestrictions`) |

#### Events & jams (listing / create; not LiveKit)

| Flow | Depth | Where |
|------|-------|-------|
| Create community event | UI | `ui/` (`createEvent`) |
| Create in-person-named event | UI | `ui/` (`eventInPerson`) |
| Event with markdown description | UI | `ui/` (`eventMarkdown`) |
| Events page heading | UI (smoke) | `ui/` (`eventList`) |
| Jams page + create jam-named event | UI (smoke) | `ui/` (`createJam`) |
| Upcoming events feed includes created event | API | `user-actions/` |
| RSVP yes on event | API | `user-actions/` |

#### Profiles & social graph

| Flow | Depth | Where |
|------|-------|-------|
| Update bio in settings | UI | `ui/` (`profileUpdate`) |
| Profile / followers / following routes + 404 | UI | `ui/` (`profileRoutes`) |
| Members page search input | UI (smoke) | `ui/` (`members`, `follow`) |
| Follow / unfollow profile | API | `user-actions/` |
| Follow creates notification for target | API | `user-actions/` |

#### Conversations & notifications

| Flow | Depth | Where |
|------|-------|-------|
| Conversations page heading | UI (smoke) | `ui/` (`messages`) |
| Notifications page heading | UI (smoke) | `ui/` (`notifications`) |
| Direct message create + reply in conversation | API | `user-actions/` |

#### Explore & settings

| Flow | Depth | Where |
|------|-------|-------|
| Explore: no results for nonsense query | UI | `ui/` (`searchNoResults`) |
| Explore: find a created post via search | UI | `ui/` (`searchPosts`) |
| Settings pages (profile, account, notifications, theme) | UI (smoke) | `ui/` (`settings`) |
| Billing link / heading when present | UI (smoke) | `ui/` (`billing`) |
| Login page available (unauthenticated) | UI (smoke) | `ui/` (`siteAvailable`) |

#### Admin & moderation

| Flow | Depth | Where |
|------|-------|-------|
| Admin configuration heading | UI (smoke) | `ui/` (`adminConfiguration`) |
| Admin invites page (new invite button) | UI (smoke) | `ui/` (`adminInvites`) |
| Invite link create + redeem on register | API | `user-actions/` |
| Report create + admin resolve | API | `user-actions/` |

---

### `default` — synthetic default-install backup

Restore: `fixtures/backups/default-install.zip` (Magic Factory sample community).

| Flow | Depth | Where |
|------|-------|-------|
| `server/info` community name from fixture | API | `default/test.ts` |
| Profiles list non-empty | API | `default/test.ts` |
| Groups list non-empty | API | `default/test.ts` |
| Register viewer (if open) → local feed responds | API | `default/test.ts` |

---

### `public` — synthetic public-community backup

Restore: `fixtures/backups/public-community.zip` (public group caps +
`publicContent` / open signups seeded).

| Flow | Depth | Where |
|------|-------|-------|
| Community name reflects public fixture | API | `public/test.ts` |
| Unauthenticated groups list + public group by-handle | API | `public/test.ts` |
| Explore page loads without auth | UI (smoke) | `public/test.ts` |
| `publicContent` and/or open registrations advertised | API | `public/test.ts` |
| Unauthenticated search API responds (200 or auth error) | API | `public/test.ts` |

---

### `sso` — OIDC mock IdP

Setup: owner bootstrap + admin config for `sso.oidc[]` pointing at mock issuer
(`OAUTH_ISSUER_URL`, default `http://oauth:8080/default`).

| Flow | Depth | Where |
|------|-------|-------|
| `server/info` lists mock OIDC provider | API | `sso/test.ts` |
| Authorize → mock IdP → callback → session token → profile | UI + API | `sso/test.ts` |
| Login page shows OIDC provider button | UI | `sso/test.ts` |

---

### `jams` — real LiveKit (conditional)

Skipped unless `JAMS_LIVEKIT_URL` / `API_KEY` / `API_SECRET` are set and not
placeholder values (`APIxxxxxxxxxxxx` / `xxxxx…`).

| Flow | Depth | Where |
|------|-------|-------|
| `server/info` reports LiveKit enabled | API | `jams/test.ts` |
| Create jam event → fetch LiveKit token | API | `jams/test.ts` |
| RoomService `listRooms` against live server | API | `jams/test.ts` |

CI: `test-integration-jams` is non-blocking (`continue-on-error`) when secrets
are missing.

---

## Intentionally shallow / not covered

These UI case **names** exist in `suites/empty/ui/` but only exercise page smoke
or create-only helpers (real coverage lives in `user-actions/` where listed
above):

- Follow / unfollow from the members page (opens `/members` only)
- “Edit post” (creates a second post; no PUT)
- Send / reply PM (opens conversations heading only)
- Change email / password in account settings (settings pages visible only)
- Pin post, poll submit, Stripe configure, community rename

Still out of scope for this harness:

- Native FCM / APN push paths
- Full browser WebRTC jam quality
- Deep E2E of every admin configuration screen
