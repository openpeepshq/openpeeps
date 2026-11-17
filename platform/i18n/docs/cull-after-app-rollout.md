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
`../../scripts/i18n-duplicate-report.mjs` (run from the repository root).

## Alias table (pass 2 delete candidates)

Last known platform consumers are `@openpeepshq/react` **0.10.0** and
`@openpeepshq/rn-components` **0.11.0**. This repo does not record which
community apps still pin that version (or older). Treat every shipped app
below **0.12.0** as a consumer of these aliases. The table uses `≤0.11.0`
for that set. 0.12.0 is the first rn-components release that retargets the
call sites (i18n 0.7.0, react 0.11.0, rn-components 0.12.0 in this PR).

| Old key                                                   | Canonical key               | Last known consumer                                                                                                                      |
| --------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts.editEmail.emailLabel`                           | `common.labels.email`       | `≤0.11.0`                                                                                                                                |
| `admin.analytics.reports.save`                            | `common.actions.save`       | `≤0.11.0`                                                                                                                                |
| `admin.analytics.table.link`                              | `common.labels.link`        | `≤0.11.0`                                                                                                                                |
| `admin.analytics.table.members`                           | `common.entities.members`   | `≤0.11.0`                                                                                                                                |
| `admin.analytics.table.visibility`                        | `common.labels.visibility`  | `≤0.11.0`                                                                                                                                |
| `admin.analytics.tabs.groups`                             | `common.entities.groups`    | `≤0.11.0` (reachable via template-literal fallback: `t(tab.i18nKey ?? \`admin.analytics.tabs.${tab.labelKey}\`)`in`AnalyticsLayout.tsx`) |
| `admin.analytics.tabs.members`                            | `common.entities.members`   | `≤0.11.0` (reachable via template-literal fallback: `t(tab.i18nKey ?? \`admin.analytics.tabs.${tab.labelKey}\`)`in`AnalyticsLayout.tsx`) |
| `admin.apiKeys.descriptionLabel`                          | `common.labels.description` | `≤0.11.0`                                                                                                                                |
| `admin.apiKeys.name`                                      | `common.labels.name`        | `≤0.11.0`                                                                                                                                |
| `admin.apiKeys.never`                                     | `common.states.never`       | `≤0.11.0`                                                                                                                                |
| `admin.apiKeys.removeScope`                               | `common.actions.remove`     | `≤0.11.0`                                                                                                                                |
| `admin.backups.restore.cancel`                            | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `admin.backups.restore.confirm`                           | `common.actions.confirm`    | `≤0.11.0`                                                                                                                                |
| `admin.backups.testRestore.cancel`                        | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `admin.database.cancel`                                   | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `admin.database.loading`                                  | `common.states.loading`     | `≤0.11.0`                                                                                                                                |
| `admin.database.save`                                     | `common.actions.save`       | `≤0.11.0`                                                                                                                                |
| `admin.groups.members`                                    | `common.entities.members`   | `≤0.11.0`                                                                                                                                |
| `admin.groups.posts`                                      | `common.entities.posts`     | `≤0.11.0`                                                                                                                                |
| `admin.groups.title`                                      | `common.entities.groups`    | `≤0.11.0`                                                                                                                                |
| `admin.inviteEmail.expiresNever`                          | `common.states.never`       | `≤0.11.0`                                                                                                                                |
| `admin.inviteLink.never`                                  | `common.states.never`       | `≤0.11.0`                                                                                                                                |
| `admin.invites.edit`                                      | `common.actions.edit`       | `≤0.11.0`                                                                                                                                |
| `admin.invites.groupsColumn`                              | `common.entities.groups`    | `≤0.11.0`                                                                                                                                |
| `admin.invites.linkColumn`                                | `common.labels.link`        | `≤0.11.0`                                                                                                                                |
| `admin.invites.linkHeading`                               | `common.labels.link`        | `≤0.11.0`                                                                                                                                |
| `admin.media.confirm.cancel`                              | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `admin.media.loading`                                     | `common.states.loading`     | `≤0.11.0`                                                                                                                                |
| `admin.members.bookmarks`                                 | `common.entities.bookmarks` | `≤0.11.0`                                                                                                                                |
| `admin.members.events`                                    | `common.entities.events`    | `≤0.11.0`                                                                                                                                |
| `admin.members.groups`                                    | `common.entities.groups`    | `≤0.11.0`                                                                                                                                |
| `admin.members.handleColumn`                              | `common.labels.handle`      | `≤0.11.0`                                                                                                                                |
| `admin.members.posts`                                     | `common.entities.posts`     | `≤0.11.0`                                                                                                                                |
| `admin.members.title`                                     | `common.entities.members`   | `≤0.11.0`                                                                                                                                |
| `admin.moderation.post.delete.cancel`                     | `common.actions.back`       | `≤0.11.0`                                                                                                                                |
| `admin.moderation.profile.delete.cancel`                  | `common.actions.back`       | `≤0.11.0`                                                                                                                                |
| `admin.overview.postsSection`                             | `common.entities.posts`     | `≤0.11.0`                                                                                                                                |
| `auth.login.email`                                        | `common.labels.email`       | `≤0.11.0`                                                                                                                                |
| `auth.register.email`                                     | `common.labels.email`       | `≤0.11.0`                                                                                                                                |
| `auth.register.handle`                                    | `common.labels.handle`      | `≤0.11.0`                                                                                                                                |
| `auth.register.name`                                      | `common.labels.name`        | `≤0.11.0`                                                                                                                                |
| `auth.requestResetPassword.email`                         | `common.labels.email`       | `≤0.11.0`                                                                                                                                |
| `capabilities.roles.create`                               | `common.actions.create`     | `≤0.11.0`                                                                                                                                |
| `capabilities.roles.description`                          | `common.labels.description` | `≤0.11.0`                                                                                                                                |
| `capabilities.roles.name`                                 | `common.labels.name`        | `≤0.11.0`                                                                                                                                |
| `common.add`                                              | `common.actions.add`        | `≤0.11.0`                                                                                                                                |
| `common.back`                                             | `common.actions.back`       | `≤0.11.0`                                                                                                                                |
| `common.cancel`                                           | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `common.close`                                            | `common.actions.close`      | `≤0.11.0`                                                                                                                                |
| `common.edit`                                             | `common.actions.edit`       | `≤0.11.0`                                                                                                                                |
| `common.form.cancel`                                      | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `common.form.date`                                        | `common.labels.date`        | `≤0.11.0`                                                                                                                                |
| `common.form.description`                                 | `common.labels.description` | `≤0.11.0`                                                                                                                                |
| `common.form.loading`                                     | `common.states.loading`     | `≤0.11.0`                                                                                                                                |
| `common.form.save`                                        | `common.actions.save`       | `≤0.11.0`                                                                                                                                |
| `common.listEditor.addTitle`                              | `common.actions.add`        | `≤0.11.0`                                                                                                                                |
| `common.listEditor.removeTitle`                           | `common.actions.remove`     | `≤0.11.0`                                                                                                                                |
| `common.loading`                                          | `common.states.loading`     | `≤0.11.0`                                                                                                                                |
| `common.remove`                                           | `common.actions.remove`     | `≤0.11.0`                                                                                                                                |
| `common.save`                                             | `common.actions.save`       | `≤0.11.0`                                                                                                                                |
| `conversations.message.delete.confirm`                    | `common.actions.delete`     | `≤0.11.0`                                                                                                                                |
| `diagnostics.email.refresh`                               | `common.actions.refresh`    | `≤0.11.0`                                                                                                                                |
| `diagnostics.email.title`                                 | `common.labels.email`       | `≤0.11.0`                                                                                                                                |
| `diagnostics.jobs.refresh`                                | `common.actions.refresh`    | `≤0.11.0`                                                                                                                                |
| `diagnostics.livekit.refresh`                             | `common.actions.refresh`    | `≤0.11.0`                                                                                                                                |
| `diagnostics.logs.date`                                   | `common.labels.date`        | `≤0.11.0`                                                                                                                                |
| `diagnostics.logs.refresh`                                | `common.actions.refresh`    | `≤0.11.0`                                                                                                                                |
| `diagnostics.performance.refresh`                         | `common.actions.refresh`    | `≤0.11.0`                                                                                                                                |
| `events.form.visibility`                                  | `common.labels.visibility`  | `≤0.11.0`                                                                                                                                |
| `events.rsvp.removeAttendee`                              | `common.actions.remove`     | `≤0.11.0`                                                                                                                                |
| `events.rsvp.scope.cancel`                                | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `events.rsvp.scope.confirm`                               | `common.actions.confirm`    | `≤0.11.0`                                                                                                                                |
| `events.tabs.description`                                 | `common.labels.description` | `≤0.11.0`                                                                                                                                |
| `explore.tabs.events`                                     | `common.entities.events`    | `≤0.11.0`                                                                                                                                |
| `explore.tabs.groups`                                     | `common.entities.groups`    | `≤0.11.0`                                                                                                                                |
| `explore.tabs.members`                                    | `common.entities.members`   | `≤0.11.0`                                                                                                                                |
| `explore.tabs.posts`                                      | `common.entities.posts`     | `≤0.11.0`                                                                                                                                |
| `form.imageEditModal.altText`                             | `common.labels.altText`     | `≤0.11.0`                                                                                                                                |
| `groups.actions.create`                                   | `common.actions.create`     | `≤0.11.0`                                                                                                                                |
| `groups.create.submit`                                    | `common.actions.create`     | `≤0.11.0`                                                                                                                                |
| `groups.delete.cancel`                                    | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `groups.delete.confirm`                                   | `common.actions.confirm`    | `≤0.11.0`                                                                                                                                |
| `groups.delete.deleteButton`                              | `common.actions.delete`     | `≤0.11.0`                                                                                                                                |
| `groups.description.title`                                | `common.labels.description` | `≤0.11.0`                                                                                                                                |
| `groups.form.members`                                     | `common.entities.members`   | `≤0.11.0`                                                                                                                                |
| `groups.handle.title`                                     | `common.labels.handle`      | `≤0.11.0`                                                                                                                                |
| `groups.members.title`                                    | `common.entities.members`   | `≤0.11.0`                                                                                                                                |
| `groups.modals.addMembers.add`                            | `common.actions.add`        | `≤0.11.0`                                                                                                                                |
| `groups.removeMember.confirm`                             | `common.actions.remove`     | `≤0.11.0`                                                                                                                                |
| `groups.sections.description`                             | `common.labels.description` | `≤0.11.0`                                                                                                                                |
| `groups.sections.events`                                  | `common.entities.events`    | `≤0.11.0`                                                                                                                                |
| `groups.sections.posts`                                   | `common.entities.posts`     | `≤0.11.0`                                                                                                                                |
| `groups.visibility.title`                                 | `common.labels.visibility`  | `≤0.11.0`                                                                                                                                |
| `jams.create.submit`                                      | `common.actions.create`     | `≤0.11.0`                                                                                                                                |
| `jams.lobby.guestEmailLabel`                              | `common.labels.email`       | `≤0.11.0`                                                                                                                                |
| `jams.modals.attendance.close`                            | `common.actions.close`      | `≤0.11.0`                                                                                                                                |
| `jams.modals.deleteScheduled.cancel`                      | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `jams.modals.deleteScheduled.delete`                      | `common.actions.delete`     | `≤0.11.0`                                                                                                                                |
| `jams.scheduler.back`                                     | `common.actions.back`       | `≤0.11.0`                                                                                                                                |
| `jams.scheduler.dateLabel`                                | `common.labels.date`        | `≤0.11.0`                                                                                                                                |
| `jams.scheduler.save`                                     | `common.actions.save`       | `≤0.11.0`                                                                                                                                |
| `media.image.addAltTextLabel`                             | `common.labels.altText`     | `≤0.11.0`                                                                                                                                |
| `media.image.altTextLabel`                                | `common.labels.altText`     | `≤0.11.0`                                                                                                                                |
| `navigation.back`                                         | `common.actions.back`       | `≤0.11.0`                                                                                                                                |
| `navigation.bookmarks`                                    | `common.entities.bookmarks` | `≤0.11.0`                                                                                                                                |
| `navigation.events`                                       | `common.entities.events`    | `≤0.11.0`                                                                                                                                |
| `navigation.groups`                                       | `common.entities.groups`    | `≤0.11.0`                                                                                                                                |
| `navigation.members`                                      | `common.entities.members`   | `≤0.11.0`                                                                                                                                |
| `posts.deleteEvent.cancel`                                | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `posts.deleteModal.cancel`                                | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `posts.deleteModal.delete`                                | `common.actions.delete`     | `≤0.11.0`                                                                                                                                |
| `posts.form.visibility.label`                             | `common.labels.visibility`  | `≤0.11.0`                                                                                                                                |
| `posts.gallery.close`                                     | `common.actions.close`      | `≤0.11.0`                                                                                                                                |
| `posts.truncatedMarkdown.close`                           | `common.actions.close`      | `≤0.11.0`                                                                                                                                |
| `profile.activity.bookmarksCount`                         | `common.entities.bookmarks` | `≤0.11.0`                                                                                                                                |
| `profile.activity.eventsCount`                            | `common.entities.events`    | `≤0.11.0`                                                                                                                                |
| `profile.activity.groupsCount`                            | `common.entities.groups`    | `≤0.11.0`                                                                                                                                |
| `profile.activity.postsCount`                             | `common.entities.posts`     | `≤0.11.0`                                                                                                                                |
| `profile.edit.cancel`                                     | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `profile.form.handle`                                     | `common.labels.handle`      | `≤0.11.0`                                                                                                                                |
| `profile.groups.tabName`                                  | `common.entities.groups`    | `≤0.11.0`                                                                                                                                |
| `profile.header.posts`                                    | `common.entities.posts`     | `≤0.11.0`                                                                                                                                |
| `profile.modals.deleteProfile.cancel`                     | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |
| `profile.modals.deleteProfile.delete`                     | `common.actions.delete`     | `≤0.11.0`                                                                                                                                |
| `profile.posts`                                           | `common.entities.posts`     | `≤0.11.0`                                                                                                                                |
| `profile.selector.remove`                                 | `common.actions.remove`     | `≤0.11.0`                                                                                                                                |
| `profile.table.delete`                                    | `common.actions.delete`     | `≤0.11.0`                                                                                                                                |
| `reports.create.back`                                     | `common.actions.back`       | `≤0.11.0`                                                                                                                                |
| `resources.actions.save`                                  | `common.actions.save`       | `≤0.11.0`                                                                                                                                |
| `resources.form.addLevelAction`                           | `common.actions.add`        | `≤0.11.0`                                                                                                                                |
| `settings.accessTokens.descriptionLabel`                  | `common.labels.description` | `≤0.11.0`                                                                                                                                |
| `settings.accessTokens.name`                              | `common.labels.name`        | `≤0.11.0`                                                                                                                                |
| `settings.accessTokens.never`                             | `common.states.never`       | `≤0.11.0`                                                                                                                                |
| `settings.account.email`                                  | `common.labels.email`       | `≤0.11.0`                                                                                                                                |
| `settings.form.imageEditModal.altText`                    | `common.labels.altText`     | `≤0.11.0`                                                                                                                                |
| `settings.notifications.pushEnabledDevices.delete.cancel` | `common.actions.cancel`     | `≤0.11.0`                                                                                                                                |

## Non-cull list

Do **not** delete these in pass 2, even when they share English with a
`common.*` key:

- **`configuration.*`** — `configurationLabelKey` builds
  `configuration.<schemaPath>`. Schema-bound titles stay.
- **`emails.*`** — server email templates. Do not retarget or delete to
  share a CTA.
- **Keys still referenced in platform code** after pass 1 — including the
  canonical `common.actions.*` / `common.labels.*` / `common.states.*` /
  `common.entities.*` keys and every feature key that was never an alias.
  As of this pass, these alias-table keys are still referenced (by a static
  key, a `*Key`/`*I18n` map value, or a template-literal key built from a
  known value) and were therefore left out of the table above:
  `admin.analytics.metrics.bookmarks` (built from `admin.analytics.metrics.${key}`
  in `platform/react/src/pages/admin/analytics/Engagement.tsx`),
  `admin.moderation.report.close.cancel`,
  `admin.moderation.reportList.closeReport` (kept local: "Close" here means
  resolve a report, not close a dialog), `auth.register.handlePlaceholder`,
  `auth.register.namePlaceholder`, `jams.lobby.guestEmailPlaceholder`
  (placeholders kept separate from their field labels so translators can
  diverge), `capabilities.relations.post.title` (referenced through
  `titleI18n` in `platform/react/src/components/RelationCapabilitiesEditor.tsx`),
  `events.form.repeat.never` (recurrence option, kept separate from
  `common.states.never`), `resources.kinds.link` (built from
  `resources.kinds.${kind}`, where `kind` ranges over `RESOURCE_KINDS`).
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
`../../scripts/i18n-duplicate-report.mjs` (run from the repository root) as
`(schema/email — do not retarget)`.

## Preconditions to delete

1. Every shipped community app is on `@openpeepshq/rn-components` **0.12.0**
   or later (the first version that no longer `t()`s the old keys).
2. Grep of `platform/react`, `platform/rn-components`, `platform/web`, and
   `platform/server` email templates finds no remaining reference to any row
   in the table. A reference is not only `t('old.key')` /
   `labelKey: 'old.key'` — it also includes `*Key` / `*I18n` map values
   (`titleI18n: 'old.key'`, `labelKey: 'old.key'`) and template-literal keys
   (`t(`old.prefix.${var}`)`) whose value domain can produce `old.key`.
   Check both forms before deleting.
3. Remove the old keys from `platform/i18n/src/locales/en.json` and
   `de.json` only. Do not change the canonical values.
4. Re-run `node ../../scripts/check-i18n-parity.mjs --strict`.
5. Optionally add CI: no unused locale key in `platform/react` +
   `platform/rn-components` + server email templates, so aliases do not
   grow back.

Pass 2 is a later PR. Do not delete from this tree until the preconditions
are met.

## Pass 3 alias table (issue #2150 delete candidates)

Consolidation of same-feature duplicate keys with divergent hierarchies.
No key is deleted from `en.json` / `de.json` in pass 3: this pass retargets
the platform call sites to the surviving key and records the retired keys
here so the 2027Q1 cull issue can be filed mechanically. Values below are
identical in EN and DE unless a note says otherwise.

Last known consumers are `@openpeepshq/react` **0.11.0** and
`@openpeepshq/rn-components` **0.12.1** (the currently released versions
still carrying the old call sites; this PR bumps to 0.11.1 / 0.12.2 /
common 0.6.2). Web-only rows note that rn-components never consumed them.

| Old key                                      | Canonical key                                        | Last known consumer                                          |
| -------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `admin.apiKeys.copy`                         | `settings.accessTokens.copy`                         | `react 0.11.0`                                               |
| `admin.apiKeys.copyWarning`                  | `settings.accessTokens.copyWarning`                  | `react 0.11.0`                                               |
| `admin.apiKeys.creating`                     | `settings.accessTokens.creating`                     | `react 0.11.0`                                               |
| `admin.apiKeys.expiration`                   | `settings.accessTokens.expiration`                   | `react 0.11.0`                                               |
| `admin.apiKeys.expirationOptions.sevenDays`  | `settings.accessTokens.expirationOptions.sevenDays`  | `react 0.11.0`                                               |
| `admin.apiKeys.expirationOptions.thirtyDays` | `settings.accessTokens.expirationOptions.thirtyDays` | `react 0.11.0`                                               |
| `admin.apiKeys.expirationOptions.ninetyDays` | `settings.accessTokens.expirationOptions.ninetyDays` | `react 0.11.0`                                               |
| `admin.apiKeys.expirationOptions.oneYear`    | `settings.accessTokens.expirationOptions.oneYear`    | `react 0.11.0`                                               |
| `admin.apiKeys.revoke`                       | `settings.accessTokens.revoke`                       | `react 0.11.0`                                               |
| `admin.apiKeys.revoked`                      | `settings.accessTokens.revoked`                      | `react 0.11.0`                                               |
| `configuration.sso.kind.entra`               | `configuration.sso.types.entra.title`                | `react 0.11.0`                                               |
| `configuration.sso.kind.generic`             | `configuration.sso.types.generic.title`              | `react 0.11.0`                                               |
| `configuration.sso.kind.gitlab-selfhosted`   | `configuration.sso.types.gitlab-selfhosted.title`    | `react 0.11.0`                                               |
| `configuration.sso.kind.google`              | `configuration.sso.types.google.title`               | `react 0.11.0`                                               |
| `configuration.sso.kind.oidc`                | `configuration.sso.types.oidc.title`                 | `react 0.11.0`                                               |
| `configuration.sso.kind.github`              | `configuration.sso.types.github.title`               | `react 0.11.0`                                               |
| `configuration.sso.kind.auth0`               | `configuration.sso.types.auth0.title`                | `react 0.11.0`                                               |
| `configuration.sso.kind.authentik`           | `configuration.sso.types.authentik.title`            | `react 0.11.0`                                               |
| `configuration.sso.kind.discord`             | `configuration.sso.types.discord.title`              | `react 0.11.0`                                               |
| `configuration.sso.kind.gitlab`              | `configuration.sso.types.gitlab.title`               | `react 0.11.0`                                               |
| `configuration.sso.kind.keycloak`            | `configuration.sso.types.keycloak.title`             | `react 0.11.0`                                               |
| `configuration.sso.kind.okta`                | `configuration.sso.types.okta.title`                 | `react 0.11.0`                                               |
| `configuration.sso.kind.pocketid`            | `configuration.sso.types.pocketid.title`             | `react 0.11.0`                                               |
| `auth.requestResetPassword.title`            | `auth.requestResetPassword.heading`                  | `react 0.11.0`                                               |
| `configuration.email.sendTest`               | `configuration.email.testTitle`                      | `react 0.11.0`                                               |
| `events.form.startDate`                      | `events.startDate`                                   | `react 0.11.0` / `rn 0.12.1`                                 |
| `events.form.endDate`                        | `events.endDate`                                     | `react 0.11.0` / `rn 0.12.1`                                 |
| `events.repeat.daily`                        | `events.form.repeat.daily`                           | `react 0.11.0` / `rn 0.12.1` (bundled via `platform/common`) |
| `events.repeat.weekly`                       | `events.form.repeat.weekly`                          | `react 0.11.0` / `rn 0.12.1` (bundled via `platform/common`) |
| `events.repeat.monthly`                      | `events.form.repeat.monthly`                         | `react 0.11.0` / `rn 0.12.1` (bundled via `platform/common`) |

Notes on the SSO kind rows:

- Retargeting the list rows to `configuration.sso.types.<kind>.title`
  changes the list-row copy for the three divergent kinds
  (`entra`: 'Microsoft' to 'Microsoft Entra ID', `oidc`: 'OIDC' to
  'OIDC Generic' / DE 'OIDC (generisch)', `gitlab-selfhosted`: 'GitLab' to
  'GitLab (self-hosted)'), toward the more precise picker names.
  `SSO_OIDC_KINDS` union `'generic'` (`platform/common/src/lib/ssoProviders.ts`)
  exactly covers the 13 `types.*` entries, so one dynamic key shape serves
  both the picker and the list. The other kind values map 1:1; the table
  lists all 13 of them so the cull issue can drop the whole
  `configuration.sso.kind` subtree mechanically.
- `admin.apiKeys.scopes` / `admin.apiKeys.noScopes` stay live and local:
  EN matches `settings.accessTokens.scopes` / `.noScopes`, but DE diverges
  ('Berechtigungen' vs 'Bereiche'), and `admin.apiKeys.scopes` doubles as
  the configuration-editor label for the schema path, so it must remain.
  The 'Bereiche' to 'Berechtigungen' wording fix is its own issue.

## Pass 3 pairs that stay (recorded for the cull issue)

Merging any of these would push one wording onto two render sites - a copy
change, not a dedup - so both keys remain live. The cull issue should pick
one wording per pair and delete the other after the app rollout:

- `articles.new` ('New article') vs `articles.form.title` ('New Article')
  - EN values diverge (DE identical); both live (`ArticleForm.tsx`
    heading, react and rn-components).
- `events.repeat.label` ('Repeats') vs `events.form.repeat.title`
  ('Repeat') - EN values diverge.

(The plan's earlier stay-pair `auth.login.title` vs `auth.login.heading` is
withdrawn: `auth.login.heading` is unreferenced at HEAD and belongs to the
dead-key table below, leaving `auth.login.title` as the only live login
header.)

## Pass 3 dead keys (unreferenced at HEAD; cull candidates)

No platform code reads these at `origin/main` HEAD (`git grep` across
react / rn-components / web / core / server), so they need no alias - the
cull issue deletes them:

| Dead key(s)                                                                      | Note                                                                                                                                                                                                |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configuration.sso.types.<kind>.description` (13 kinds x 2 locales = 26 strings) | Zero references at HEAD and across all history; the SSO picker uses only the `title` keys.                                                                                                          |
| `auth.login.heading`                                                             | Svelte-era; never referenced by react-era code (no consumer bound).                                                                                                                                 |
| `auth.login.submit`                                                              | Svelte-era; never referenced by react-era code (no consumer bound).                                                                                                                                 |
| `auth.resetPassword.title`                                                       | Svelte-era; never referenced by react-era code (no consumer bound).                                                                                                                                 |
| `posts.deleteModal.delete` / `posts.deleteModal.cancel`                          | Last shipped in `@openpeepshq/react` 0.10.0 / rn 0.11.0; pass 1 moved the buttons to `common.actions.*`.                                                                                            |
| `conversations.message.delete.*` (whole subtree)                                 | `deleteDescription`/`deleteSuccess`/`deleteError` were never referenced anywhere; the rest was orphaned when the rn delete sheet was removed in `fc1dd34e`. Last consumer react 0.10.0 / rn 0.11.0. |
| `events.repeat.badge`                                                            | No counterpart in `events.form.repeat.*`; the remaining `events.repeat.*` display keys (`everyN*`, `weeklyOn`, `everyNWeeksOn`, `until`, `times`, `label`) stay live via `formatEventRecurrence`.   |
