# OpenPeeps API test plan

Checklist of **HTTP API cases** that should be covered by automated tests.
This is not a claim of current coverage.

**Base path:** `/api/openpeeps/core/v1`  
**Sources:** `platform/server/src/api/openpeeps/core/v1/` (~187 Riddl routes),
`platform/client/src/endpoints/`, Express mounts in
`platform/server/src/server.ts`, capabilities in
`platform/common/src/types/capabilities.ts`.

## How to read

| Column | Meaning |
|--------|---------|
| ID | Stable case id |
| Endpoint | `METHOD path` (relative to base unless absolute) |
| Preconditions | Auth / caps / seed |
| Expected | Status + key assertions |
| Notes | Caps, side effects, drift |

For **every** authenticated or capability-gated endpoint, also cover the matrix
unless a row already specializes it:

1. **Unauth** — no Bearer → typically `401` when handler calls `ensureLocalProfile`
   / `ensureAccount` / `ensureRoleCapabilities` (global middleware alone does
   **not** 401).
2. **Insufficient capability** — member JWT without required `core-*` → `403`.
3. **Happy path** — actor with required identity/caps → `2xx` + schema shape.
4. **Key negatives** — listed per row (duplicate, closed reg, bad signature, …).

### Auth model (apply globally)

| Layer | Behavior |
|-------|----------|
| Global JWT middleware | Optional Bearer; invalid/missing → empty auth context, not automatic 401 |
| Handler `ensure*` | Imperative gates in route handlers (`platform/server/src/lib/auth.ts`) |
| Typical errors | `401` authNeeded · `403` forbidden · `404` notFound · `409`/`422` conflict · `400` badRequest |

Suggested assertion sketch:

```ts
expect((await request.get(path)).status()).toBe(401); // when ensure* requires auth
expect([401, 403]).toContain(
  (await request.post(path, { headers: apiHeaders(memberToken), data })).status(),
);
expect(res.ok(), await res.text()).toBeTruthy();
```

Existing helpers: `platform/tests/helpers/api.ts`. Suites:
`empty/api`, `empty/user-actions`, `empty/email-push`, `public`, `sso`, `jams`.

---

## 1. Auth

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-AUTH-01 | `POST /auth/register` | open registration | `200` + token | |
| API-AUTH-02 | `POST /auth/register` | closed registration | `403` | |
| API-AUTH-03 | `POST /auth/register` | duplicate email/handle | `422`/`409` | |
| API-AUTH-04 | `POST /auth/register` | invite required + valid `inviteCode` | `200` | |
| API-AUTH-05 | `POST /auth/register` | invite required + missing/bad code | `403`/`404` | |
| API-AUTH-06 | `POST /auth/login` | valid creds | `200` + token | |
| API-AUTH-07 | `POST /auth/login` | bad password | `403`/`404` | |
| API-AUTH-08 | `POST /auth/refresh` | valid refreshable auth | new token | |
| API-AUTH-09 | `POST /auth/refresh` | missing/invalid | `401` | |
| API-AUTH-10 | `POST /auth/request-reset-password` | known email | accepted; Mailpit email | |
| API-AUTH-11 | `POST /auth/request-reset-password` | unknown email | stable response / `404` per policy | no user enum if applicable |
| API-AUTH-12 | `POST /auth/reset-password` | reset Bearer | password changed; login works | |
| API-AUTH-13 | `POST /auth/reset-password` | bad token | `403`/`404` | |
| API-AUTH-14 | `GET /auth/validate-email?token=` | valid token | `200` | |
| API-AUTH-15 | `GET /auth/validate-email?token=` | bad/expired | `400` | |
| API-AUTH-16 | `POST /auth/guest-pass` | public guest resource | guest JWT | |
| API-AUTH-17 | `POST /auth/guest-pass` | jam closed / invalid | `403`/`409` | |

---

## 2. Accounts

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-ACCT-01 | `GET /accounts/current` | account token | public account | `ensureAccount` |
| API-ACCT-02 | `GET /accounts/current` | unauth | `401` | |
| API-ACCT-03 | `PATCH /accounts/current` | correct current password | email/password update | |
| API-ACCT-04 | `PATCH /accounts/current` | wrong current password | `403`/`404` | |
| API-ACCT-05 | `GET /accounts/current/push-subscriptions` | account | list | |
| API-ACCT-06 | `POST /accounts/current/push-subscriptions` | account | created | |
| API-ACCT-07 | `DELETE /accounts/current/push-subscriptions/:id` | own sub | deleted | |
| API-ACCT-08 | `POST /accounts/current/push-subscriptions/test` | local profile | push side-effect | push-catcher |
| API-ACCT-09 | `POST /accounts/current/validation-email` | account | Mailpit email | |

---

## 3. Profiles

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-PROF-01 | `GET /profiles` | public community guest | list or policy OK | public matrix |
| API-PROF-02 | `GET /profiles` | private community guest | `401`/`403` | |
| API-PROF-03 | `GET /profiles/:id` | readable profile | profile | `core-profiles-read` |
| API-PROF-04 | `GET /profiles/by-handle/:handle` | known handle | profile | |
| API-PROF-05 | `GET /profiles/:id` | blocked/private | `403` | |
| API-PROF-06 | `GET /profiles/current` | local profile | self | |
| API-PROF-07 | `PATCH /profiles/current` | local | fields updated | |
| API-PROF-08 | `GET /profiles/current/settings` | guest OK if allowed | settings | |
| API-PROF-09 | `PUT /profiles/current/settings` | local | settings saved | |
| API-PROF-10 | `GET /profiles/current/notifications` | local | paginated list | |
| API-PROF-11 | `GET /profiles/current/notifications/stats` | local | stats | |
| API-PROF-12 | `GET /profiles/current/notifications/types` | local | types | |
| API-PROF-13 | `GET /profiles/current/notifications/:id` | local | one notification | |
| API-PROF-14 | `PUT /profiles/current/notifications/mark-all-seen` | local | unseen cleared | |
| API-PROF-15 | `GET /profiles/current/bookmarkedIds` | local | ids | |
| API-PROF-16 | `GET /profiles/current/reposts` | local | posts | |
| API-PROF-17 | `GET /profiles/current/access-tokens` | local | list | |
| API-PROF-18 | `POST /profiles/current/access-tokens` | local | token created | |
| API-PROF-19 | `DELETE /profiles/current/access-tokens/:id` | local | revoked | |
| API-PROF-20 | `POST /profiles/:id/follow` | `core-profiles-follow` | following + notify | |
| API-PROF-21 | `DELETE /profiles/:id/follow` | following | unfollowed | |
| API-PROF-22 | `GET /profiles/:id/followers` | readable | list | |
| API-PROF-23 | `GET /profiles/:id/following` | readable | list | |
| API-PROF-24 | `GET /profiles/:id/common-groups` | readable | list | |

---

## 4. Posts & feeds

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-POST-01 | `POST /posts` note | `core-posts-create-*` | created | |
| API-POST-02 | `POST /posts` poll/event/article | type-specific caps | created | |
| API-POST-03 | `POST /posts` wrong visibility/type cap | member without cap | `403` | |
| API-POST-04 | `GET /posts` | public/private matrix | list or `401` | |
| API-POST-05 | `GET /posts/by-type/:type` | optional community | filtered | |
| API-POST-06 | `GET /posts/by-hashtag/:hashtag` | optional community | filtered | |
| API-POST-07 | `GET /posts/by-group/:groupId` | group readable | filtered | |
| API-POST-08 | `GET /posts/by-profile/:profileId` | profile readable | filtered | |
| API-POST-09 | `GET /posts/feeds/local` | public matrix | feed | |
| API-POST-10 | `GET /posts/feeds/my` | local | feed; unauth `401` | |
| API-POST-11 | `GET /posts/feeds/events/*` (upcoming/past/current) | optional community | lists | |
| API-POST-12 | `GET /posts/feeds/events/my/*` | local | lists | |
| API-POST-13 | `GET /posts/feeds/events/by-group/:groupId/*` | group | lists | |
| API-POST-14 | `GET /posts/feeds/jams/*` | optional | lists | |
| API-POST-15 | `GET /posts/feeds/jams/my/*` | local | lists | |
| API-POST-16 | `GET /posts/:id` | readable | post | |
| API-POST-17 | `PUT /posts/:id` | owner/update cap | updated | |
| API-POST-18 | `PUT /posts/:id` | stranger | `403` | |
| API-POST-19 | `DELETE /posts/:id` | owner/delete cap | deleted | |
| API-POST-20 | `GET /posts/:id/context` | readable | context | |
| API-POST-21 | `GET /posts/:id/replies` | readable | replies | |
| API-POST-22 | `GET /posts/:id/reposts` | readable | list | |
| API-POST-23 | `POST /posts/:id/reposts` | create caps | repost | |
| API-POST-24 | `POST /posts/:id/react` | local + react | reacted | idempotency |
| API-POST-25 | `DELETE /posts/:id/react` | reacted | cleared | |
| API-POST-26 | `POST /posts/:id/bookmark` | local | bookmarked | |
| API-POST-27 | `DELETE /posts/:id/bookmark` | bookmarked | cleared | |
| API-POST-28 | `GET /posts/bookmarks` | local | list | |
| API-POST-29 | `POST /posts/:id/vote` | poll + vote cap | voted | |
| API-POST-30 | `POST /posts/:id/rsvp` | event + rsvp | RSVP set | |
| API-POST-31 | `POST /posts/:id/rsvp/:profileId` | manage rsvp | set for profile | |
| API-POST-32 | `POST /posts/seen` | local | unseen drops | |
| API-POST-33 | `POST /posts/seen/by-group/:groupId` | local | group unseen drops | |
| API-POST-34 | `GET /posts/unseen/counts` | local | counts | |
| API-POST-35 | `GET /posts/:id/recordings` | local | list | |
| API-POST-36 | `DELETE /posts/:id/recordings/:recordingId` | allowed | deleted | |
| API-POST-37 | `POST /posts/:id/recordings/:recordingId/reply` | allowed | reply published | |

---

## 5. Groups

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-GRP-01 | `GET /groups` | `ensureAccess` matrix | list | |
| API-GRP-02 | `POST /groups` | `core-groups-create` | created | |
| API-GRP-03 | `POST /groups` | no create cap | `403` | |
| API-GRP-04 | `POST /groups` | duplicate handle | `409` | |
| API-GRP-05 | `GET /groups/:id` | `core-groups-read` | group | |
| API-GRP-06 | `GET /groups/by-handle/:handle` | readable | group | |
| API-GRP-07 | `GET /groups/:id` | private, outsider | `403` | |
| API-GRP-08 | `PUT /groups/:id` | update cap | updated | |
| API-GRP-09 | `DELETE /groups/:id` | delete cap | deleted | |
| API-GRP-10 | `POST /groups/:id/join` | joinable + join cap | joined | |
| API-GRP-11 | `DELETE /groups/:id/leave` | member | left | |
| API-GRP-12 | `DELETE /groups/:id/leave` | last admin | blocked/`403`/`409` | |
| API-GRP-13 | `GET /groups/:id/members` | read | members | |
| API-GRP-14 | `POST /groups/:id/members` | addMember | added | |
| API-GRP-15 | `PUT /groups/:id/members/:profileId` | changeRole | roles updated | |
| API-GRP-16 | `DELETE /groups/:id/members/:profileId` | removeMember | removed | |

---

## 6. Jams

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-JAM-01 | `GET /jams?live=` | optional auth | live list | |
| API-JAM-02 | `GET /jams/:eventId/token` | read or service jam scope / guest | LiveKit token | `suites/jams` |
| API-JAM-03 | `GET /jams/:eventId/state` | read/service | state | |
| API-JAM-04 | `PUT /jams/:eventId/close` | local + `core-posts-jam-moderate` | closed | |
| API-JAM-05 | `POST /jams/:eventId/mute-participant` | moderator | muted | |
| API-JAM-06 | `GET /jams/:eventId/waiting-room` | local (SSE) | stream/events | |
| API-JAM-07 | `POST /jams/:eventId/waiting-room` | local | join waiting | |
| API-JAM-08 | `POST /jams/:eventId/waiting-room/:profileId/admit` | host | admitted | |
| API-JAM-09 | `GET /jams/:eventId/events` | allowed | chat/events | |
| API-JAM-10 | `POST /jams/:eventId/events` | participant | event persisted | |
| API-JAM-11 | `GET /jams/:eventId/events/attendance` | allowed | attendance | |
| API-JAM-12 | `POST /jams/:eventId/recordings` | moderate | recording started | |
| API-JAM-13 | `PUT /jams/:eventId/recordings/stop` | moderate | stopped | |
| API-JAM-14 | `GET /jams/:eventId/recordings/observer-link` | moderate | link | |

---

## 7. Conversations

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-DM-01 | `GET /conversations` | local | own threads only | |
| API-DM-02 | `GET /conversations` | unauth | `401` | |
| API-DM-03 | `GET /conversations/:id` | participant + read | thread | |
| API-DM-04 | `GET /conversations/:id` | stranger | `403` | |
| API-DM-05 | `POST /conversations/:id/posts` | participant + reply | message created | |

---

## 8. Media

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-MED-01 | `POST /media` | auth | multipart upload OK | |
| API-MED-02 | `POST /media` | unauth | `401`/`403` | |
| API-MED-03 | `GET /media/:id` | allowed | metadata | |
| API-MED-04 | `PUT /media/:id` | local owner | updated | |
| API-MED-05 | `GET /media/:id/progress` | uploader | SSE progress | |
| API-MED-06 | Express `GET /storage/:bucket/:id/:filename` | known object | bytes `200` | non-Riddl |
| API-MED-07 | Express `GET /storage/...` | missing | `404` | |
| API-MED-08 | Express `GET /media/streaming/:storageId/*` | HLS asset | playlist/segment; Range `206` | |

Do **not** assert client orphans `GET /media` list or `DELETE /media/:id` until
server routes exist (see drift).

---

## 9. Search

All require local profile today (`ensureLocalProfile`) unless policy changes.

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-SEARCH-01 | `GET /search/posts?q=` | local | results/empty | |
| API-SEARCH-02 | `GET /search/profiles?q=` | local | results/empty | |
| API-SEARCH-03 | `GET /search/events?q=` | local | results/empty | |
| API-SEARCH-04 | `GET /search/jams?q=` | local | results/empty | |
| API-SEARCH-05 | `GET /search/groups?q=` | local | results/empty | |
| API-SEARCH-06 | `GET /search/counts?q=` | local | counts shape | |
| API-SEARCH-07 | search endpoints | unauth | `401` | public suite may allow 401/403 |
| API-SEARCH-08 | pagination `offset`/`limit` | local | stable paging | |

---

## 10. Reports (member)

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-REP-01 | `POST /reports` | `core-reports-create` | created | |
| API-REP-02 | `POST /reports` | no create cap | `403` | |
| API-REP-03 | `GET /reports` | local | member-visible list | |
| API-REP-04 | `GET /reports/:reportId` | allowed | detail | |

Do **not** assert client `PATCH/DELETE /reports/:id` until server routes exist.

---

## 11. Invite links

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-INV-01 | `GET /invite-links` | `core-inviteLinks-read` | list | client `admin.invites` |
| API-INV-02 | `POST /invite-links` | create | created | |
| API-INV-03 | `PUT /invite-links/:id/activate` | update | active | |
| API-INV-04 | `PUT /invite-links/:id/deactivate` | update | inactive | |
| API-INV-05 | register with invite code | active link | register OK | cross-domain |

---

## 12. Admin

Unless noted: Bearer + `ensureRoleCapabilities`. Matrix: unauth `401`, member
`403`, admin/owner `2xx`.

### 12.1 Accounts & profiles

| ID | Endpoint | Cap / notes | Expected |
|----|----------|-------------|----------|
| API-ADM-ACCT-01 | `GET /admin/accounts` | `core-accounts-list`/`read` | list |
| API-ADM-ACCT-02 | `GET /admin/accounts/:accountId` | read | account |
| API-ADM-ACCT-03 | `PATCH /admin/accounts/:accountId` | update | patched |
| API-ADM-ACCT-04 | `DELETE /admin/accounts/:accountId` | delete | deleted |
| API-ADM-ACCT-05 | `GET /admin/accounts/:accountId/profiles` | read | profiles |
| API-ADM-PROF-01 | `GET /admin/profiles` | `core-profiles-read` | list |
| API-ADM-PROF-02 | `GET /admin/profiles/export` | read | CSV text |
| API-ADM-PROF-03 | `DELETE /admin/profiles/:profileId` | delete | deleted |
| API-ADM-PROF-04 | `GET /admin/profiles/:profileId/roles` | read | roles |
| API-ADM-PROF-05 | `PUT /admin/profiles/:profileId/roles` | `core-profiles-roles-update` | updated |

### 12.2 Groups, reports, roles

| ID | Endpoint | Cap / notes | Expected |
|----|----------|-------------|----------|
| API-ADM-GRP-01 | `GET /admin/groups` | `core-groups-read` | list |
| API-ADM-GRP-02 | `DELETE /admin/groups/:groupId` | `core-groups-delete` | deleted |
| API-ADM-REP-01 | `GET /admin/reports` | `core-reports-read` | list |
| API-ADM-REP-02 | `GET /admin/reports/:reportId` | read | detail |
| API-ADM-REP-03 | `PUT /admin/reports/:reportId/resolve` | update | resolved |
| API-ADM-REP-04 | `PUT /admin/reports/:reportId/reopen` | update | reopened |
| API-ADM-ROLE-01 | `GET /admin/roles` | `core-roles-read` | list |
| API-ADM-ROLE-02 | `PUT /admin/roles/:roleId` | `core-roles-update` | updated |

### 12.3 Config, i18n, posts ops

| ID | Endpoint | Cap / notes | Expected |
|----|----------|-------------|----------|
| API-ADM-CFG-01 | `GET /admin/config/:namespace/:name` | `core-config-read` | value + defaults |
| API-ADM-CFG-02 | `PATCH /admin/config/:namespace/:name` | `core-config-update` | updated |
| API-ADM-CFG-03 | `POST /admin/configuration/email/test` | config | Mailpit email |
| API-ADM-I18N-01 | `GET /admin/i18n` | **verify auth gate** | defaults/merged/overrides |
| API-ADM-I18N-02 | `PUT /admin/i18n/overrides` | `core-i18n-update` | saved |
| API-ADM-POST-01 | `PATCH /admin/pinned-post` | `core-customization-update` | pinned |
| API-ADM-POST-02 | `POST /admin/posts/:postId/announce` | `core-posts-announce` | announced |

### 12.4 Diagnostics, logs, stats, restart

| ID | Endpoint | Cap / notes | Expected |
|----|----------|-------------|----------|
| API-ADM-DIAG-01 | `GET /admin/diagnostics/email/queue-stats` | config-read | stats |
| API-ADM-DIAG-02 | `POST /admin/diagnostics/email/test` | config | queue test |
| API-ADM-DIAG-03 | `GET /admin/diagnostics/jobs/:queue/:jobId` | config-read | job detail |
| API-ADM-LOG-01 | `GET /admin/logs?date=` | `core-logs-read` | rows |
| API-ADM-STAT-01 | `GET /admin/stats` | `core-analytics-read` | stats |
| API-ADM-MAINT-01 | `POST /admin/server/restart` | `core-maintenance-restart` | accepted | not in client |

### 12.5 DB explorer

| ID | Endpoint | Cap | Expected |
|----|----------|-----|----------|
| API-ADM-DB-01 | `GET /admin/db/token` | `core-db-access` | token |
| API-ADM-DB-02 | `GET /admin/db/tables` | db-access | tables |
| API-ADM-DB-03 | `GET /admin/db/tables/:table/rows` | db-access | rows |
| API-ADM-DB-04 | `PUT /admin/db/tables/:table/rows` | db-access | updated |
| API-ADM-DB-05 | `GET /admin/db/tables/:table/export` | db-access | CSV |
| API-ADM-DB-06 | `POST /admin/db/sql` | db-access | result/error | destructive |

### 12.6 Backups & service tokens

| ID | Endpoint | Cap | Expected |
|----|----------|-----|----------|
| API-ADM-BKP-01 | `GET /admin/backups` | `core-backups-read` | names |
| API-ADM-BKP-02 | `POST /admin/backups` | create | success |
| API-ADM-BKP-03 | `POST /admin/backups/restore` | restore | restore kicked | destructive |
| API-ADM-TOK-01 | `GET /admin/service-access-tokens` | `core-serviceTokens-read` | list |
| API-ADM-TOK-02 | `POST /admin/service-access-tokens` | create | token |
| API-ADM-TOK-03 | `DELETE /admin/service-access-tokens/:id` | revoke | revoked |

---

## 13. Payments

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-PAY-01 | `POST /payments/create-checkout` | local + account | checkout URL | Stripe |
| API-PAY-02 | `POST /payments/create-portal` | Stripe customer | portal URL | |
| API-PAY-03 | `GET /payments/status` | local | status shape | |
| API-PAY-04 | `GET /payments/success` | local + account | success handling | |
| API-PAY-05 | `POST /payments/test` | public | validates key probe | |
| API-PAY-06 | `POST /payments/webhook` | valid Stripe-Signature | processed | |
| API-PAY-07 | `POST /payments/webhook` | missing/bad sig | reject | |

---

## 14. SSO

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-SSO-01 | `POST /sso/generic` | valid exchange | token | |
| API-SSO-02 | `GET /sso/oidc/:id/authorize` | configured provider | redirect | `suites/sso` |
| API-SSO-03 | `GET /sso/oidc/:id/callback` | valid callback | token → usable `/profiles/current` | |
| API-SSO-04 | `GET /server/info` | public | lists OIDC providers when configured | |

---

## 15. Location, i18n, preview, streaming

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-LOC-01 | `GET /location/geocode?query=` | local | results | |
| API-LOC-02 | `GET /location/geocode` | unauth | `401` | |
| API-I18N-01 | `GET /i18n/languages` | public | language list | |
| API-I18N-02 | `GET /i18n/:lang` | known lang | resource | |
| API-I18N-03 | `GET /i18n/:lang` | bad lang | `404` | |
| API-PREV-01 | `GET /fetch-url/:url` | allowed URL | preview payload | |
| API-PREV-02 | `GET /fetch-url/:url` | blocked/bad | `403`/`404` | |
| API-STR-01 | `POST /streaming/vod` | local | job created | |
| API-STR-02 | `GET /streaming/vod/:storageId/status` | existing job | status | **verify auth** |

---

## 16. Server, webhooks, remote-control

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-SRV-01 | `GET /server/info` | public | name, publicContent, LiveKit, OIDC | |
| API-SRV-02 | `GET /server/config/capabilities` | public | capability catalog | |
| API-SRV-03 | `GET /server/keys/webhooks` | public | JWT public key | |
| API-SRV-04 | `POST /server/keys/webhooks/verify` | body token | verify result | |
| API-SRV-05 | `GET /server/stats/current` | per handler | stats shape | |
| API-RC-01 | `POST /remote-control/render-email` | service scope `{type:'render',id:'*'}` | rendered | |
| API-RC-02 | `POST /remote-control/render-email` | user JWT | `403` | |

---

## 17. Express / non-Riddl mounts

Absolute paths (not under `/api/openpeeps/core/v1` unless noted).

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-X-01 | `GET /health` | none | `{status:'ok'}` | |
| API-X-02 | `GET /openapi.json` | none | OpenAPI 3.0 doc | |
| API-X-03 | `GET /backups/:name.zip` | Bearer/`?token=` + `core-backups-download` | zip stream | |
| API-X-04 | `GET /backups/:name.zip` | no token | `401` | |
| API-X-05 | `GET /backups/:name.zip` | no download cap | `403` | |
| API-X-06 | `PUT/POST /s3/:bucket/:filename` | egress stub | upload/complete | LiveKit egress |
| API-X-07 | `GET /pwa/manifest.json` (+ icons, `/favicon.ico`) | none | manifest/icons | |
| API-X-08 | `ALL /_db`, `/_db/*` | none | `303` → `/admin/db` | |
| API-X-09 | `GET /api/pwa/manifest.json` | none | manifest | Riddl |
| API-X-10 | `GET /api/.well-known/apple-app-site-association` | none | AASA | |
| API-X-11 | SPA `GET /*` non-api | built web dist | `index.html` | |

### MCP (when `@openpeepshq/mcp` is mounted)

Disable with `OPENPEEPS_MCP=0`.

| ID | Endpoint | Preconditions | Expected | Notes |
|----|----------|---------------|----------|-------|
| API-MCP-01 | `POST /mcp/community` `tools/list` | Bearer | community tools only (no `admin_*`) | |
| API-MCP-02 | `POST /mcp/ops` `tools/list` | admin-capable Bearer | ops/`admin_*` tools | |
| API-MCP-03 | either MCP URL | no Bearer | `401` | |
| API-MCP-04 | `tools/call` community tool | valid user/service JWT | API result JSON text | pass-through |
| API-MCP-05 | `tools/call` ops tool | member without admin | API `403` surfaced | |
| API-MCP-06 | MCP disabled | `OPENPEEPS_MCP=0` | routes absent / 404 | |

---

## 18. Public-community matrix

Cross-cutting cases (parameterize `publicContent` on/off):

| ID | Surface | Guest expected when public | Guest expected when private |
|----|---------|----------------------------|-----------------------------|
| API-PUB-01 | `GET /posts/feeds/local` | `200` | `401`/`403` |
| API-PUB-02 | `GET /groups` | `200` | `401`/`403` |
| API-PUB-03 | `GET /profiles` | `200` | `401`/`403` |
| API-PUB-04 | `GET /posts/:id` (public post) | `200` | gated |
| API-PUB-05 | `GET /server/info` | always `200`; flag reflects config | same |

Use suites `public` + `default`/`empty` for both sides.

---

## 19. Client / server drift (do not test blind)

| Client | Server reality | Action for tests |
|--------|----------------|------------------|
| `media.list`, `media.delete` | No `GET /media` or `DELETE /media/:id` | Skip until implemented |
| `reports.update`, `reports.delete` | No PATCH/DELETE on `/reports` | Skip until implemented |
| `admin.profiles.listByAccount` path | Server: `/admin/accounts/:id/profiles` | Call server path |
| — | `POST /admin/server/restart` missing from client | Test via raw HTTP |
| `admin.invites.*` | Hits `/invite-links` (correct) | OK |

---

## Suite mapping appendix

| Area | Closest existing coverage |
|------|---------------------------|
| OpenAPI + register smoke | `empty/api` |
| Deep mutations (post/group/follow/DM/RSVP/report) | `empty/user-actions` |
| Email + push side effects | `empty/email-push` |
| Public guest access | `suites/public` |
| OIDC | `suites/sso` |
| Jam token (real LiveKit) | `suites/jams` |
| Admin / media / payments / search matrix / MCP | largely gaps |

---

## Out of scope / env-dependent

- Charging real Stripe customers or mutating production webhooks
- Jam A/V quality (see `pnpm --filter @openpeepshq/tests run loadtest:jam`)
- Destructive DB SQL / backup restore against shared non-ephemeral data
- Auto-generating cases from OpenAPI without human allow-lists (tooling may help later)
