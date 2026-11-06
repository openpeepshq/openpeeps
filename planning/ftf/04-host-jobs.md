# Host gap: plugin jobs and notifications

**OpenPeeps PR 3.** Worker loads plugins; plugins declare cron/queue jobs;
plugins can emit host notifications without hijacking a CoreEvent.

## Why interceptors are not enough

Plugin interceptors use `hub.on` (live Redis). FTF crons today
([`ForTheFamly/vercel.json`](../../../ForTheFamly/vercel.json)):

| Cron | Schedule | v1? |
| --- | --- | --- |
| `/api/cron/nudges` | hourly | yes |
| `/api/cron/recurrence` | daily 06:00 | yes |
| `/api/cron/rank-snapshot` | Sunday 00:00 | yes |
| `/api/cron/check-in-prompt` | Sunday 18:00 | yes |
| `/api/cron/revalidate-blog` | daily | no |
| `/api/cron/trial-reminders` | daily | no |

Those must run even if no HTTP request is in flight. That is BullMQ, which
lives in [`platform/worker`](../../platform/worker). The worker currently
starts email, media, notifications, analytics, … and **never**
`initializePlugins()`.

## Jobs export

```ts
export const jobs = async () => ({
  recurrence: {
    pattern: '0 6 * * *',
    processor: async () => { /* … */ },
  },
  nudges: {
    pattern: '0 * * * *',
    processor: async () => { /* … */ },
  },
});
```

Queue name: `plugin:<namespace>/<name>:<jobKey>` so plugins cannot clobber
`send-email` / `notifications`.

Worker (`platform/worker/src/index.ts`):

1. `await initializePlugins()` (same config / `PLUGINS_PATH` as the server)
2. For each loaded module with `jobs`, register a BullMQ worker + repeatable
   job
3. Failures in one plugin job must not stop other workers
4. Disable/reload: remove repeatable jobs for plugins that are no longer
   loaded

Timezone: use the community timezone from host config when scheduling, or
document UTC and let FTF convert. Prefer community timezone.

Server process must **not** also run these processors (duplicate crons).

## Notifications

FTF notifies on agreement created / agreed / declined / completed, nudges,
check-in prompts, shoutouts.

Today:

- `maybeCreateNotification` in
  [`mutations.ts`](../../platform/core/src/notifications/mutations.ts)
  inserts an in-app row for any `type: string` and emits `notificationCreated`.
- Push/email rendering looks up `notificationHandlers.get(type).pushRenderer`
  ([`jobs.ts`](../../platform/core/src/notifications/jobs.ts)).
- `registerNotificationHandler` **also** does `hub.once(handler.event)`, and
  `event` is a CoreEvent. Agreement events are not CoreEvents.

Add a documented helper on `@openpeepshq/core/plugins`, e.g.:

```ts
registerPluginNotification({
  type: 'forthefamly.agreement_nudge',
  defaultSettings: { create: true, push: true, email: false },
  pushRenderer: async (notification) => ({
    title: '…',
    options: { body: '…', link: '/p/famly/…' },
  }),
});
```

This only fills the handler map (plus default settings). It does **not**
subscribe to CoreEvents. Plugin routes/jobs call `maybeCreateNotification`
with that `type`, `fromProfileId`, and `data` (agreement/family ids, link).

`link` must be a `/p/famly/...` path so the web shell opens the plugin app.
Native stub can ignore deep links in v1.

Do not add FTF types to the host notification enum (there isn’t a closed
enum; `type` is already `z.string()`).

## Docs and tests

- `backend.md`: `jobs` export, queue naming, worker loads plugins,
  `registerPluginNotification`.
- Tests: job namespacing; disabled plugin does not keep a repeatable job;
  notification helper registers pushRenderer without requiring a CoreEvent.
- Greeter: optional `jobs.ping` logging once a day is enough as a fixture.

## Out of this PR

New CoreEvents, plugin email HTML templates, FTF processors themselves.
