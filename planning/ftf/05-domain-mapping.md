# Domain mapping

How ForTheFamly concepts map onto one OpenPeeps community, and which tables
/ APIs survive v1.

Source of truth for current FTF schema:
`ForTheFamly/src/db/schema.ts` (31 tables).

## Identity and tenancy

| FTF                                                  | Plugin v1                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tenants` (slug, Stripe, trial, seats)               | Implicit: the OpenPeeps community                                                                                        |
| `tenant_memberships` + tenant roles                  | Community membership + plugin family roles. Community admins (`core-*`) may manage plugin settings.                      |
| `users` / `sessions` / password reset / email verify | OpenPeeps account + profile. `ensurePluginAuth` → `req.pluginProfile.id`                                                 |
| `platform_super_admin` / `/platform-admin`           | Out of v1                                                                                                                |
| Child cannot self-signup                             | Children are community profiles invited into a family with role `child`. Community registration policy stays host-owned. |

Store **OpenPeeps profile UUIDs** everywhere FTF stored `user_id`. Never
store FTF user rows.

## Families (plugin-owned, not OpenPeeps groups)

OpenPeeps groups have community roles and feeds. FTF families have
`parent | child | mentor | guardian`, kid UX, stars, and private agreements.
Do not map family → group in v1.

`families.tenant_id` goes away. `created_by_profile_id` is required.

`family_memberships`: unique `(family_id, profile_id)`, `family_role`,
`is_active`.

Kid vs adult is **plugin-internal**: if the caller’s memberships are all
`child` (or the active family role is `child`), render `/p/famly/kid`. Do
not add a host profile type.

## Invites

Keep plugin `invites` scoped to a family (token, role, optional email,
reusable links). Accept path: signed-in community profile + token →
membership row.

Do not invent a second community account. If the invitee has no community
account, send them through host register, then return to
`/p/famly/invite/:token`.

## Media

FTF stores `proof_url` / `image_url` as data-URL or https in Postgres.
Plugin v1: upload via host media API with the user JWT, persist
`proof_media_id` / `image_media_id` (OpenPeeps media id). Serve via host
media URLs.

## Notifications

Drop plugin `notifications` and `push_subscriptions` tables. Use host
`maybeCreateNotification` + `registerPluginNotification` (see
[04-host-jobs.md](04-host-jobs.md)).

Notification `link` values: `/p/famly/agreements/:id`, `/p/famly/families/:id`,
etc.

## Tables

### Drop (SaaS surround)

`tenants`, `tenant_memberships`, `users`, `sessions`, `email_verifications`,
`password_resets`, `push_subscriptions`, `stripe_webhook_events`,
`trial_nudges`, `nudges` (billing pings).

### Keep (plugin schema), with `*_user_id` → `*_profile_id`

| Table                    | Notes                                                    |
| ------------------------ | -------------------------------------------------------- |
| `families`               | No `tenant_id`                                           |
| `family_memberships`     | Roles unchanged                                          |
| `invites`                | Family-scoped; `inviter_profile_id`                      |
| `agreements`             | Recurrence, proof, points, doer_ids as profile UUID JSON |
| `agreement_signoffs`     | `proof_media_id` instead of `proof_url`                  |
| `agreement_messages`     | `image_media_id` instead of `image_url`                  |
| `agreement_reactions`    |                                                          |
| `message_reads`          |                                                          |
| `extension_requests`     |                                                          |
| `counter_proposals`      |                                                          |
| `rewards`                |                                                          |
| `reward_redemptions`     |                                                          |
| `family_check_ins`       |                                                          |
| `shoutouts`              |                                                          |
| `user_stats`             | Rename mentally to profile stats; key is `profile_id`    |
| `family_stats`           |                                                          |
| `family_rank_snapshots`  | Drop `tenant_id`; rank within the community              |
| `announcements`          | Community-wide inside the plugin (no tenant)             |
| `challenges`             | Same                                                     |
| `challenge_participants` |                                                          |

Zuki / appearance (`skin_tone`, `hair_style`, `tour_state`) can live as a
small `profile_prefs` table keyed by `profile_id`, not on a user row.

## HTTP API (FTF `src/app/api`)

Prefix after port:
`/api/openpeeps/core/v1/plugins/senatmade/forthefamly`.

### Port (core product)

- `families`, `families/:id`, `families/:id/agreements`, signoff, reward-given
- `families/:id/rewards`, redeem, redemptions
- `families/:id/check-in`, shoutouts
- `agreements/:id` messages, reactions, nudge, archive
- `agreements/:id/extension-request` + review
- `agreements/:id/counter-proposal` + review
- `invites`, `invites/:token`, `invites/:token/accept`
- `chats/unread` (agreement-thread inbox)
- `announcements`, `challenges` (+ join)
- `activity` (family/community activity feed inside the plugin)
- `nudge` / `nudge/pending` **only** for agreement nudges, not billing

### Drop

- Entire `auth/*`
- `stripe/*`
- `push/*` (host push)
- `platform-admin/*`
- `waitlist`, `newsletter`, `org-inquiry`
- `cron/*` (become plugin `jobs`)
- `tenants/:slug/dashboard`, `export`, `leaderboard` as **Work/HR** surfaces.
  A simple family leaderboard can stay as `GET /leaderboard` without seats.

Every private route: `ensurePluginAuth`, then load memberships, then
enforce family-role (parents create agreements / approve rewards; children
sign off and redeem; mentors/guardians as in current FTF).

## Config (host `configSchema`)

Keep small: feature flags, default reminder days, whether kid home is
enabled. Not Stripe keys.

Admin chrome: `plugins.admin.configuration.famly` + locale keys
`configuration.plugins.famly.title` / `.description`.
