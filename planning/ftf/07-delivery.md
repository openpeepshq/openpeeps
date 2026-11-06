# Delivery

Three repos, three review surfaces. Host contract first (the plugin cannot
boot without it). One concern per OpenPeeps PR (AGENTS.md).

| Repo             | Owns                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| OpenPeeps        | Host gaps (pages, persistence, jobs), greeter fixture, these planning docs |
| New plugin repo  | `senatmade/forthefamly` package (API, SQL, IIFE UI, jobs)                  |
| ForTheFamly SaaS | Reference implementation + forthefamly.org; not the plugin                 |

## OpenPeeps PRs

| Order | Branch (suggested)        | Scope                                                                                        | Docs                                             |
| ----- | ------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1     | `feat/plugin-app-pages`   | `manifest.app`, `/p/:basePath`, sidebar, stylesheet loader, greeter page, native stub        | [02-host-pages.md](02-host-pages.md)             |
| 2     | `feat/plugin-persistence` | `persistence` export, `plugin_<ns>_<name>` schema, migration ledger, `pluginDb`, backup note | [03-host-persistence.md](03-host-persistence.md) |
| 3     | `feat/plugin-jobs`        | Worker `initializePlugins`, `jobs` export, `registerPluginNotification`                      | [04-host-jobs.md](04-host-jobs.md)               |

Each PR: rebase on `main`, one conventional signed commit, `node scripts/check-branch.mjs`,
tea PR, no labels/milestones. Outline in the body (these all exceed 3 files).

Version bumps: minor (`feat:`) on each touched `@openpeepshq/*` package
(common, core, react, web, rn-components, i18n, server/worker as applicable).

i18n: add keys in `locales/en.json` **and** `de.json`. Do not delete old keys.

Web/native: pages PR must include the native stub in the same change.

Do not edit `CHANGELOG.md`.

## Plugin repo work (after host PR 1 at least)

New repository, not a branch of OpenPeeps or of the ForTheFamly SaaS.
Skeleton can target pages-only (hello route + empty shell). Persistence and
jobs land when host PRs 2–3 merge (or against a local OpenPeeps branch).

| Step                                 | Depends on host            | Outcome                                                       |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------- |
| Skeleton package                     | PR 1                       | Installs; `/p/famly` renders; `GET .../hello` with JWT        |
| Schema + membership + agreements API | PR 2                       | Data in `plugin_senatmade_forthefamly`                        |
| Adult UI                             | PR 1–2                     | Families / agreements usable                                  |
| Kid + stars/rewards                  | PR 1–2                     | Role-split UX                                                 |
| Check-ins, shoutouts, challenges     | PR 1–2                     | Remaining v1 product                                          |
| Jobs + notifications                 | PR 3                       | Recurrence, nudges, ranks, check-in prompts                   |
| Store tarball                        | PRs 1–3 on a released host | `hostRange` matches; signed artifact on plugins.openpeeps.org |

Local install during development: `PLUGINS_PATH` bind-mount or admin
“install from git”. Production: marketplace listing
`senatmade/forthefamly`.

## Fixtures

Greeter (in OpenPeeps) proves the contract without FTF:

- `/p/greeter` page + optional stylesheet
- Optional one-table persistence
- Optional daily log job

Do not block host PRs on the plugin port.

## Test plan (host)

- Greeter page is in-shell, listed in the sidebar, themed.
- `/p/not-a-plugin` is not-found; `/p/greeter` does not match `/:handle`.
- Stylesheet loads from `/plugin-assets/.../web/` and cannot escape `web/`.
- Native `/p/greeter` shows the web-only message.
- Persistence: two migrations apply once; bad SQL fails that plugin only.
- Backup dump includes `plugin_*` schemas.
- Worker registers `plugin-openpeepshq-examples-greeter-plugin-…`;
  disabling the plugin removes the repeatable job.
- `registerPluginNotification` + `maybeCreateNotification` creates an
  in-app notification without a CoreEvent.

## Test plan (plugin)

- Parent creates a family, invites a community profile as child.
- Child sees kid home; parent sees adult home.
- Agreement signoff with host media as proof.
- Reward redeem / parent approve.
- Recurrence job creates the next occurrence.
- Nudge creates a host notification whose link opens `/p/famly/agreements/:id`.
- Uninstall drops plugin schema; disable leaves data.

## Explicitly not scheduled

- Full SaaS parity (Stripe, Work/Org, marketing)
- RN ForTheFamly UI
- Family = OpenPeeps group
- Plugin sandboxing
- Moving the plugin into `openpeeps/plugins/` or into the ForTheFamly SaaS repo
