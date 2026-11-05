# Cull locale aliases after community-app rollout

Pass 1 of issue #114 adds canonical `common.*` keys and retargets current
platform call sites. It does **not** delete the old keys.

## Why the aliases must stay

Web and native both load locales from the server:

`GET /api/openpeeps/core/v1/i18n/:lang`

That endpoint serves today's `en.json` / `de.json` (plus host/plugin/DB
overrides). Community apps can pin an old `@openpeepshq/rn-components` while
still fetching the current payload. Removing a key from the JSON breaks those
apps immediately even though this repo no longer calls `t()` on it.

Copies in JSON are Weblate-safe. A compile-time alias layer can wait until
this cull.

The live mapping of 4+ English values is
`scripts/i18n-duplicate-report.mjs`.

## Alias table (pass 2 delete candidates)

Last known platform consumers are `@openpeepshq/react` and
`@openpeepshq/rn-components` **0.9.0**. This repo does not record which
community apps still pin that version (or older). Treat every shipped app
below **0.10.0** as a consumer of these aliases. The table uses `≤0.9.0`
for that set.

| Old key                                                   | Canonical key               | Last known consumer |
| --------------------------------------------------------- | --------------------------- | ------------------- |
| `accounts.editEmail.emailLabel`                           | `common.labels.email`       | `≤0.9.0`            |
| `admin.analytics.metrics.bookmarks`                       | `common.nav.bookmarks`      | `≤0.9.0`            |
| `admin.analytics.reports.save`                            | `common.actions.save`       | `≤0.9.0`            |
| `admin.analytics.table.link`                              | `common.labels.link`        | `≤0.9.0`            |
| `admin.analytics.table.members`                           | `common.nav.members`        | `≤0.9.0`            |
| `admin.analytics.table.visibility`                        | `common.labels.visibility`  | `≤0.9.0`            |
| `admin.analytics.tabs.groups`                             | `common.nav.groups`         | `≤0.9.0`            |
| `admin.analytics.tabs.members`                            | `common.nav.members`        | `≤0.9.0`            |
| `admin.apiKeys.descriptionLabel`                          | `common.labels.description` | `≤0.9.0`            |
| `admin.apiKeys.name`                                      | `common.labels.name`        | `≤0.9.0`            |
| `admin.apiKeys.never`                                     | `common.states.never`       | `≤0.9.0`            |
| `admin.apiKeys.removeScope`                               | `common.actions.remove`     | `≤0.9.0`            |
| `admin.backups.restore.cancel`                            | `common.actions.cancel`     | `≤0.9.0`            |
| `admin.backups.restore.confirm`                           | `common.actions.confirm`    | `≤0.9.0`            |
| `admin.backups.testRestore.cancel`                        | `common.actions.cancel`     | `≤0.9.0`            |
| `admin.database.cancel`                                   | `common.actions.cancel`     | `≤0.9.0`            |
| `admin.database.loading`                                  | `common.states.loading`     | `≤0.9.0`            |
| `admin.database.save`                                     | `common.actions.save`       | `≤0.9.0`            |
| `admin.groups.members`                                    | `common.nav.members`        | `≤0.9.0`            |
| `admin.groups.posts`                                      | `common.nav.posts`          | `≤0.9.0`            |
| `admin.groups.title`                                      | `common.nav.groups`         | `≤0.9.0`            |
| `admin.inviteEmail.expiresNever`                          | `common.states.never`       | `≤0.9.0`            |
| `admin.inviteLink.never`                                  | `common.states.never`       | `≤0.9.0`            |
| `admin.invites.edit`                                      | `common.actions.edit`       | `≤0.9.0`            |
| `admin.invites.groupsColumn`                              | `common.nav.groups`         | `≤0.9.0`            |
| `admin.invites.linkColumn`                                | `common.labels.link`        | `≤0.9.0`            |
| `admin.invites.linkHeading`                               | `common.labels.link`        | `≤0.9.0`            |
| `admin.media.confirm.cancel`                              | `common.actions.cancel`     | `≤0.9.0`            |
| `admin.media.loading`                                     | `common.states.loading`     | `≤0.9.0`            |
| `admin.members.bookmarks`                                 | `common.nav.bookmarks`      | `≤0.9.0`            |
| `admin.members.events`                                    | `common.nav.events`         | `≤0.9.0`            |
| `admin.members.groups`                                    | `common.nav.groups`         | `≤0.9.0`            |
| `admin.members.handleColumn`                              | `common.labels.handle`      | `≤0.9.0`            |
| `admin.members.posts`                                     | `common.nav.posts`          | `≤0.9.0`            |
| `admin.members.title`                                     | `common.nav.members`        | `≤0.9.0`            |
| `admin.moderation.post.delete.cancel`                     | `common.actions.back`       | `≤0.9.0`            |
| `admin.moderation.profile.delete.cancel`                  | `common.actions.back`       | `≤0.9.0`            |
| `admin.moderation.report.close.cancel`                    | `common.actions.back`       | `≤0.9.0`            |
| `admin.moderation.reportList.closeReport`                 | `common.actions.close`      | `≤0.9.0`            |
| `admin.overview.postsSection`                             | `common.nav.posts`          | `≤0.9.0`            |
| `auth.login.email`                                        | `common.labels.email`       | `≤0.9.0`            |
| `auth.register.email`                                     | `common.labels.email`       | `≤0.9.0`            |
| `auth.register.handle`                                    | `common.labels.handle`      | `≤0.9.0`            |
| `auth.register.handlePlaceholder`                         | `common.labels.handle`      | `≤0.9.0`            |
| `auth.register.name`                                      | `common.labels.name`        | `≤0.9.0`            |
| `auth.register.namePlaceholder`                           | `common.labels.name`        | `≤0.9.0`            |
| `auth.requestResetPassword.email`                         | `common.labels.email`       | `≤0.9.0`            |
| `capabilities.relations.post.title`                       | `common.nav.posts`          | `≤0.9.0`            |
| `capabilities.roles.create`                               | `common.actions.create`     | `≤0.9.0`            |
| `capabilities.roles.description`                          | `common.labels.description` | `≤0.9.0`            |
| `capabilities.roles.name`                                 | `common.labels.name`        | `≤0.9.0`            |
| `common.add`                                              | `common.actions.add`        | `≤0.9.0`            |
| `common.back`                                             | `common.actions.back`       | `≤0.9.0`            |
| `common.cancel`                                           | `common.actions.cancel`     | `≤0.9.0`            |
| `common.close`                                            | `common.actions.close`      | `≤0.9.0`            |
| `common.edit`                                             | `common.actions.edit`       | `≤0.9.0`            |
| `common.form.cancel`                                      | `common.actions.cancel`     | `≤0.9.0`            |
| `common.form.date`                                        | `common.labels.date`        | `≤0.9.0`            |
| `common.form.description`                                 | `common.labels.description` | `≤0.9.0`            |
| `common.form.loading`                                     | `common.states.loading`     | `≤0.9.0`            |
| `common.form.save`                                        | `common.actions.save`       | `≤0.9.0`            |
| `common.listEditor.addTitle`                              | `common.actions.add`        | `≤0.9.0`            |
| `common.listEditor.removeTitle`                           | `common.actions.remove`     | `≤0.9.0`            |
| `common.loading`                                          | `common.states.loading`     | `≤0.9.0`            |
| `common.remove`                                           | `common.actions.remove`     | `≤0.9.0`            |
| `common.save`                                             | `common.actions.save`       | `≤0.9.0`            |
| `conversations.message.delete.confirm`                    | `common.actions.delete`     | `≤0.9.0`            |
| `diagnostics.email.refresh`                               | `common.actions.refresh`    | `≤0.9.0`            |
| `diagnostics.email.title`                                 | `common.labels.email`       | `≤0.9.0`            |
| `diagnostics.jobs.refresh`                                | `common.actions.refresh`    | `≤0.9.0`            |
| `diagnostics.livekit.refresh`                             | `common.actions.refresh`    | `≤0.9.0`            |
| `diagnostics.logs.date`                                   | `common.labels.date`        | `≤0.9.0`            |
| `diagnostics.logs.refresh`                                | `common.actions.refresh`    | `≤0.9.0`            |
| `diagnostics.performance.refresh`                         | `common.actions.refresh`    | `≤0.9.0`            |
| `events.form.repeat.never`                                | `common.states.never`       | `≤0.9.0`            |
| `events.form.visibility`                                  | `common.labels.visibility`  | `≤0.9.0`            |
| `events.rsvp.removeAttendee`                              | `common.actions.remove`     | `≤0.9.0`            |
| `events.rsvp.scope.cancel`                                | `common.actions.cancel`     | `≤0.9.0`            |
| `events.rsvp.scope.confirm`                               | `common.actions.confirm`    | `≤0.9.0`            |
| `events.tabs.description`                                 | `common.labels.description` | `≤0.9.0`            |
| `explore.tabs.events`                                     | `common.nav.events`         | `≤0.9.0`            |
| `explore.tabs.groups`                                     | `common.nav.groups`         | `≤0.9.0`            |
| `explore.tabs.members`                                    | `common.nav.members`        | `≤0.9.0`            |
| `explore.tabs.posts`                                      | `common.nav.posts`          | `≤0.9.0`            |
| `form.imageEditModal.altText`                             | `common.labels.altText`     | `≤0.9.0`            |
| `groups.actions.create`                                   | `common.actions.create`     | `≤0.9.0`            |
| `groups.create.submit`                                    | `common.actions.create`     | `≤0.9.0`            |
| `groups.delete.cancel`                                    | `common.actions.cancel`     | `≤0.9.0`            |
| `groups.delete.confirm`                                   | `common.actions.confirm`    | `≤0.9.0`            |
| `groups.delete.deleteButton`                              | `common.actions.delete`     | `≤0.9.0`            |
| `groups.description.title`                                | `common.labels.description` | `≤0.9.0`            |
| `groups.form.members`                                     | `common.nav.members`        | `≤0.9.0`            |
| `groups.handle.title`                                     | `common.labels.handle`      | `≤0.9.0`            |
| `groups.members.title`                                    | `common.nav.members`        | `≤0.9.0`            |
| `groups.modals.addMembers.add`                            | `common.actions.add`        | `≤0.9.0`            |
| `groups.removeMember.confirm`                             | `common.actions.remove`     | `≤0.9.0`            |
| `groups.sections.description`                             | `common.labels.description` | `≤0.9.0`            |
| `groups.sections.events`                                  | `common.nav.events`         | `≤0.9.0`            |
| `groups.sections.posts`                                   | `common.nav.posts`          | `≤0.9.0`            |
| `groups.visibility.title`                                 | `common.labels.visibility`  | `≤0.9.0`            |
| `jams.create.submit`                                      | `common.actions.create`     | `≤0.9.0`            |
| `jams.lobby.guestEmailLabel`                              | `common.labels.email`       | `≤0.9.0`            |
| `jams.lobby.guestEmailPlaceholder`                        | `common.labels.email`       | `≤0.9.0`            |
| `jams.modals.attendance.close`                            | `common.actions.close`      | `≤0.9.0`            |
| `jams.modals.deleteScheduled.cancel`                      | `common.actions.cancel`     | `≤0.9.0`            |
| `jams.modals.deleteScheduled.delete`                      | `common.actions.delete`     | `≤0.9.0`            |
| `jams.scheduler.back`                                     | `common.actions.back`       | `≤0.9.0`            |
| `jams.scheduler.dateLabel`                                | `common.labels.date`        | `≤0.9.0`            |
| `jams.scheduler.save`                                     | `common.actions.save`       | `≤0.9.0`            |
| `media.image.addAltTextLabel`                             | `common.labels.altText`     | `≤0.9.0`            |
| `media.image.altTextLabel`                                | `common.labels.altText`     | `≤0.9.0`            |
| `navigation.back`                                         | `common.actions.back`       | `≤0.9.0`            |
| `navigation.bookmarks`                                    | `common.nav.bookmarks`      | `≤0.9.0`            |
| `navigation.events`                                       | `common.nav.events`         | `≤0.9.0`            |
| `navigation.groups`                                       | `common.nav.groups`         | `≤0.9.0`            |
| `navigation.members`                                      | `common.nav.members`        | `≤0.9.0`            |
| `posts.deleteEvent.cancel`                                | `common.actions.cancel`     | `≤0.9.0`            |
| `posts.deleteModal.cancel`                                | `common.actions.cancel`     | `≤0.9.0`            |
| `posts.deleteModal.delete`                                | `common.actions.delete`     | `≤0.9.0`            |
| `posts.form.visibility.label`                             | `common.labels.visibility`  | `≤0.9.0`            |
| `posts.gallery.close`                                     | `common.actions.close`      | `≤0.9.0`            |
| `posts.truncatedMarkdown.close`                           | `common.actions.close`      | `≤0.9.0`            |
| `profile.activity.bookmarksCount`                         | `common.nav.bookmarks`      | `≤0.9.0`            |
| `profile.activity.eventsCount`                            | `common.nav.events`         | `≤0.9.0`            |
| `profile.activity.groupsCount`                            | `common.nav.groups`         | `≤0.9.0`            |
| `profile.activity.postsCount`                             | `common.nav.posts`          | `≤0.9.0`            |
| `profile.edit.cancel`                                     | `common.actions.cancel`     | `≤0.9.0`            |
| `profile.form.handle`                                     | `common.labels.handle`      | `≤0.9.0`            |
| `profile.groups.tabName`                                  | `common.nav.groups`         | `≤0.9.0`            |
| `profile.header.posts`                                    | `common.nav.posts`          | `≤0.9.0`            |
| `profile.modals.deleteProfile.cancel`                     | `common.actions.cancel`     | `≤0.9.0`            |
| `profile.modals.deleteProfile.delete`                     | `common.actions.delete`     | `≤0.9.0`            |
| `profile.posts`                                           | `common.nav.posts`          | `≤0.9.0`            |
| `profile.selector.remove`                                 | `common.actions.remove`     | `≤0.9.0`            |
| `profile.table.delete`                                    | `common.actions.delete`     | `≤0.9.0`            |
| `reports.create.back`                                     | `common.actions.back`       | `≤0.9.0`            |
| `resources.actions.save`                                  | `common.actions.save`       | `≤0.9.0`            |
| `resources.form.addLevelAction`                           | `common.actions.add`        | `≤0.9.0`            |
| `resources.kinds.link`                                    | `common.labels.link`        | `≤0.9.0`            |
| `settings.accessTokens.descriptionLabel`                  | `common.labels.description` | `≤0.9.0`            |
| `settings.accessTokens.name`                              | `common.labels.name`        | `≤0.9.0`            |
| `settings.accessTokens.never`                             | `common.states.never`       | `≤0.9.0`            |
| `settings.account.email`                                  | `common.labels.email`       | `≤0.9.0`            |
| `settings.form.imageEditModal.altText`                    | `common.labels.altText`     | `≤0.9.0`            |
| `settings.notifications.pushEnabledDevices.delete.cancel` | `common.actions.cancel`     | `≤0.9.0`            |

## Non-cull list

Do **not** delete these in pass 2, even when they share English with a
`common.*` key:

- **`configuration.*`** — `configurationLabelKey` builds
  `configuration.<schemaPath>`. Schema-bound titles stay.
- **`emails.*`** — server email templates. Do not retarget or delete to
  share a CTA.
- **Keys still referenced in platform code** after pass 1 — including the
  canonical `common.actions.*` / `common.labels.*` / `common.states.*` /
  `common.nav.*` keys and every feature key that was never an alias.
- **`admin.backups.loading`** — English is `Loading…` but German already
  diverges (`Laden...` vs `Wird geladen…`). Not an alias.
- **Homographs and context-specific 4+ values** that stay in the feature
  tree: `All`, `Public`, `Private`, `Community`, `Post`, `Reply`,
  `Continue`, `Reposts`, `Reactions`, `Replies`, `Participants`,
  `Followers`, `Join Jam`, `Leave Jam`, `All dates in the series`,
  `Click here to visit the group and manage your membership`,
  `View event`, `No groups available`.

`configuration.*` / `emails.*` keys that happen to match a 4+ English
value (`Cancel`, `Email`, `Save`, …) are listed by
`scripts/i18n-duplicate-report.mjs` as `(schema/email — do not retarget)`.

## Preconditions to delete

1. Every shipped community app is on `@openpeepshq/rn-components` **0.10.0**
   or later (the first version that no longer `t()`s the old keys).
2. Grep of `platform/react`, `platform/rn-components`, `platform/web`, and
   `platform/server` email templates finds no remaining `t('old.key')` /
   `labelKey: 'old.key'` for any row in the table.
3. Remove the old keys from `platform/i18n/src/locales/en.json` and
   `de.json` only. Do not change the canonical values.
4. Re-run `node scripts/check-i18n-parity.mjs --strict`.
5. Optionally add CI: no unused locale key in `platform/react` +
   `platform/rn-components` + server email templates, so aliases do not
   grow back.

Pass 2 is a later PR. Do not delete from this tree until the preconditions
are met.
