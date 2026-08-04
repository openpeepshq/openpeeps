# Email delivery test plan

Integration coverage for every template registered in
`platform/server/src/emails/index.ts`, asserted via Mailpit (same pattern as
existing API/UI suites).

Legend: **covered** = Mailpit subject/recipient + body content assert ·
**gap** = not yet asserted · **deferred** = needs LiveKit / heavier setup

## Transactional templates

| Template                | Trigger                      | Subject (approx.)                     | Status                 |
| ----------------------- | ---------------------------- | ------------------------------------- | ---------------------- |
| `welcome`               | Register                     | `Welcome to …!`                       | covered (this suite)   |
| `validateEmail`         | Register / resend validation | `Validate your email for …!`          | covered                |
| `resetPassword`         | Request password reset       | `Reset your password for …!`          | covered (API + UI)     |
| `test`                  | Admin diagnostics email test | `Test email from …!`                  | covered (`email-push`) |
| `eventRsvpConfirmation` | RSVP yes/maybe on event      | `You're going:` / `You might attend:` | covered (this suite)   |

## Notification templates (`email: true` by default)

| Template                     | Trigger                     | Status                  |
| ---------------------------- | --------------------------- | ----------------------- |
| `notification-follow`        | Profile follow              | covered                 |
| `notification-reply`         | Reply to a post             | covered                 |
| `notification-mention`       | `@handle` in a note         | covered                 |
| `notification-directMessage` | Direct conversation message | covered                 |
| `notification-announcement`  | Admin announce post         | covered                 |
| `notification-newGroupPost`  | Post in a joined group      | covered                 |
| `notification-newProfile`    | New registration (admins)   | covered                 |
| `notification-jamModerator`  | Jam moderator invite        | deferred → `jams` suite |
| `notification-jamSpeaker`    | Jam speaker invite          | deferred → `jams` suite |

## Notification templates (`email: false` by default)

Enable via `PUT /profiles/current/settings` then trigger:

| Template                         | Trigger                    | Status                                          |
| -------------------------------- | -------------------------- | ----------------------------------------------- |
| `notification-reaction`          | React to a post            | covered                                         |
| `notification-repost`            | Repost                     | covered                                         |
| `notification-groupAdded`        | Admin adds member to group | covered                                         |
| `notification-groupMemberJoined` | Member joins group         | covered                                         |
| `notification-groupMemberLeft`   | Member leaves group        | covered                                         |
| `notification-jamStarted`        | Jam starts                 | deferred → `jams` suite                         |
| `notification-pollVote`          | Poll vote                  | no template registered (i18n only)              |
| `notification-rsvp`              | RSVP notification to host  | no template registered (ICS email covers guest) |

## UI parity (`email-push/`)

| Flow                                | Status  |
| ----------------------------------- | ------- |
| Signup form → welcome + validate    | covered |
| Forgot password form → reset mail   | covered |
| Welcome checklist → resend validate | covered |

## Body content

Notification emails that embed posts (DM, new group post, reply, mention,
announcement, reaction, repost) assert Mailpit HTML/text includes the unique
post snippet and rejects unresolved `color: var(--…)` (blank-looking theme
renders). Transactional mails assert links/names similarly.

## Out of scope

- Template HTML pixel/CSS regression (use `server/scripts/smoke-render.ts`)
- SMTP transport config beyond Mailpit in CI
- Implementing missing `pollVote` / `rsvp` React email templates (product work)
