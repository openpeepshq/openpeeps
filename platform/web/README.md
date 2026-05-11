# @openpeeps/web

Vite + React SPA shell that consumes `@openpeeps/react`, `@openpeeps/react-ui`
and the REST API exposed by `@openpeeps/server`. Mirrors the SvelteKit app in
`platform/app` route-for-route; pages that depend on yet-unported components
render a `<PageStub>` that points back to their Svelte source.

## Scripts

- `pnpm dev` — Vite dev server on port `5174`, proxies `/api` to
  `http://localhost:5173` (override with `VITE_API_PROXY_TARGET`).
- `pnpm build` — produces `dist/` (static SPA + service worker + manifest).
- `pnpm preview` — serves the built `dist/` locally.
- `pnpm typecheck` — `tsc --noEmit`.

## Deployment

The production Docker image (`Dockerfile` at the workspace root) builds this
package alongside `@openpeeps/server` and `@openpeeps/worker`, and the server
serves `dist/` as static files with an SPA fallback. See `docker/prod/start.sh`
for the entry-point commands (`web`, `worker`).

## Page port status

Mapped 1:1 against `platform/app/src/routes/**/+page.svelte` (76 pages). Only
one route still renders `<PageStub>` (the admin DB browser); the rest are
real React pages.

### Public / auth

| URL                              | React page                                |
| -------------------------------- | ----------------------------------------- |
| `/`                              | `src/pages/Home.tsx`                      |
| `/about`                         | `src/pages/About.tsx`                     |
| `/code-of-conduct`               | `src/pages/CodeOfConduct.tsx`             |
| `/welcome`                       | `src/pages/Welcome.tsx`                   |
| `/auth/login`                    | `src/pages/auth/Login.tsx`                |
| `/auth/register`                 | `src/pages/auth/Register.tsx`             |
| `/auth/register/invitation`      | `src/pages/auth/RegisterInvitation.tsx`   |
| `/auth/request-reset-password`   | `src/pages/auth/RequestResetPassword.tsx` |
| `/auth/reset-password`           | `src/pages/auth/ResetPassword.tsx`        |
| `/auth/closed`                   | `src/pages/auth/Closed.tsx`               |
| `/auth/sso/generic`              | `src/pages/auth/SsoCallback.tsx`          |

### Feeds, posts, profiles

| URL                              | React page                                | Notes                                |
| -------------------------------- | ----------------------------------------- | ------------------------------------ |
| `/feeds/local`                   | `src/pages/feeds/Local.tsx`               | Compose new note + infinite feed     |
| `/feeds/my`                      | `src/pages/feeds/My.tsx`                  | Compose new note + infinite feed     |
| `/feeds/bookmarks`               | `src/pages/feeds/Bookmarks.tsx`           |                                      |
| `/tags/:hashtag`                 | `src/pages/Tags.tsx`                      | Feed scoped to a hashtag             |
| `/posts/:postId`                 | `src/pages/PostDetail.tsx`                | Thread + inline reply composer       |
| `/notifications`                 | `src/pages/Notifications.tsx`             |                                      |
| `/explore`                       | `src/pages/Explore.tsx`                   | Member + post tabs                   |
| `/members`                       | `src/pages/Members.tsx`                   |                                      |
| `/@:handle`                      | `src/pages/Profile.tsx`                   | Header + posts                       |
| `/@:handle/followers`            | `src/pages/profile/Followers.tsx`         |                                      |
| `/@:handle/following`            | `src/pages/profile/Followers.tsx`         | Same component (`following` prop)    |

### Conversations, events, jams, articles, groups

| URL                              | React page                                |
| -------------------------------- | ----------------------------------------- |
| `/conversations`                 | `src/pages/conversations/Index.tsx`       |
| `/conversations/:id`             | `src/pages/conversations/Show.tsx`        |
| `/conversations/:id/info`        | `src/pages/conversations/Info.tsx`        |
| `/events`                        | `src/pages/events/Index.tsx`              |
| `/events/my`                     | `src/pages/events/My.tsx`                 |
| `/events/new`                    | `src/pages/events/New.tsx`                |
| `/events/:eventId/edit`          | `src/pages/events/Edit.tsx`               |
| `/jams`                          | `src/pages/jams/Index.tsx`                |
| `/jams/my`                       | `src/pages/jams/Index.tsx` (`my` prop)    |
| `/events/:eventId/jam`           | `src/pages/jams/Event.tsx` (`<JamRoom>`)  |
| `/articles`                      | `src/pages/articles/Index.tsx`            |
| `/articles/new`                  | `src/pages/articles/New.tsx`              |
| `/articles/:articleId/edit`      | `src/pages/articles/Edit.tsx`             |
| `/groups`                        | `src/pages/groups/Index.tsx`              |
| `/groups/new`                    | `src/pages/groups/New.tsx`                |
| `/groups/@:handle`               | `src/pages/groups/Show.tsx`               |
| `/groups/@:handle/info`          | `src/pages/groups/Info.tsx`               |
| `/groups/@:handle/edit`          | `src/pages/groups/Edit.tsx`               |
| `/groups/@:handle/members`       | `src/pages/groups/Members.tsx`            |

### Settings

| URL                                  | React page                                |
| ------------------------------------ | ----------------------------------------- |
| `/settings`                          | `src/pages/settings/Index.tsx`            |
| `/settings/public-profile`           | `src/pages/settings/PublicProfile.tsx`    |
| `/settings/theme`                    | `src/pages/settings/Theme.tsx`            |
| `/settings/account`                  | `src/pages/settings/Account.tsx`          |
| `/settings/notifications`            | `src/pages/settings/Notifications.tsx`    |
| `/settings/billing`                  | `src/pages/settings/Billing.tsx`          |
| `/payment/success`                   | `src/pages/payment/Success.tsx`           |

### Admin

| URL                                                          | React page                              |
| ------------------------------------------------------------ | --------------------------------------- |
| `/admin`                                                     | `src/pages/admin/Dashboard.tsx`         |
| `/admin/logs`                                                | `src/pages/admin/Logs.tsx`              |
| `/admin/members`                                             | `src/pages/admin/Members.tsx`           |
| `/admin/invites`                                             | `src/pages/admin/Invites.tsx`           |
| `/admin/backups`                                             | `src/pages/admin/Backups.tsx`           |
| `/admin/analytics`                                           | `src/pages/admin/Analytics.tsx`         |
| `/admin/moderation`                                          | `src/pages/admin/Moderation.tsx`        |
| `/admin/moderation/reports/@:handle`                         | `src/pages/admin/Reports.tsx`           |
| `/admin/groups`                                              | `src/pages/admin/Groups.tsx`            |
| `/admin/groups/@:handle/members`                             | `src/pages/admin/GroupMembers.tsx`      |
| `/admin/configuration`                                       | `src/pages/admin/Configuration.tsx`     |
| `/admin/configuration/server-settings`                       | `AdminConfigEditor` (JSON-backed form)  |
| `/admin/configuration/i18n`                                  | `AdminConfigEditor`                     |
| `/admin/configuration/community/{info,favicons,theme,…}`     | `AdminConfigEditor`                     |

The `AdminConfigEditor` component is a generic JSON editor that drives all 11
community-config slots through `admin.config.{read,update}` so the routes stay
covered while feature-specific forms can replace them slot-by-slot later.

### Test / utility

| URL                              | React page                                |
| -------------------------------- | ----------------------------------------- |
| `/test/markdown`                 | `src/pages/test/Markdown.tsx`             |
| `/test/error`                    | `src/pages/test/Error.tsx`                |

### Remaining stubs

Only one route still renders `<PageStub>`:

- `/admin/db` — needs the specialized RethinkDB browser to be ported.

### React component additions

The following components live in `@openpeeps/react/components`:

- **Profile**: `<Avatar>`, `<ProfileHeader>`, `<ProfileCard>`,
  `<ProfilePostsAndReplies>`.
- **Post**: `<Feed>`, `<FeedPost>`, `<FeedPostContent>`, `<FeedNote>`,
  `<FeedArticle>`, `<FeedEvent>`, `<FeedPoll>`, `<PostInfoHeader>`,
  `<PostReactionHeader>`, `<FeedPostStats>`, `<PostActions>`,
  `<Attachments>`, `<UpdatingDate>`, `<PostMarkdown>`, `<PostDetail>`,
  `<NewNoteButton>`, plus helpers (`firstNWords`, `postReactionStats`,
  `stringToSegments`, `useDefaultVisibility`).
- **Notifications**: `<NotificationItem>`, `<NotificationsList>`.
- **Groups**: `<GroupCard>`, `<GroupHeader>`, `<GroupFeed>`.
- **Jams**: `<JamRoom>` (top-level), `<JamLobby>`, `<JamVideoCall>`,
  `<JamProvider>` + `useJamContext()` / `useJamObserver()`,
  plus `defaultRoomOptions` / `JAM_EMOJIS` constants. Built on
  `@livekit/components-react` (`PreJoin`, `LiveKitRoom`, `VideoConference`,
  `RoomAudioRenderer`) and `livekit-client`.

`@openpeeps/react` depends on `marked` for the inline post-markdown renderer
and now also exposes `usePaymentStatus` / `createCustomerPortalAction` /
`createCheckoutAction` (via `paymentHooks`).

## Patterns

- Use `useT()` from `@openpeeps/react` for i18n (not `react-i18next`).
- Use `useOpenpeeps()` to get the API client and `useCredentialsStore()` for
  the credentials store. Shared mutations live in `src/lib/auth.ts`.
- Form pages use `Form` + `FormInput` + `SubmitButton` from `@openpeeps/react-ui`.
  Pass a stable `data` reference; `FormInput` mutates it through `deepSet`.
- Static markdown content (about, code-of-conduct, welcome) uses the local
  `src/lib/Markdown.tsx` renderer (powered by `marked`).
- Page routing lives entirely in `src/App.tsx`; protected vs public layout is
  controlled by mounting the route inside (or outside) the `<RootLayout>`
  wrapper.
