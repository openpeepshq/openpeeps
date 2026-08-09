# Routes

An overview of the available routes in the OpenPeeps web application. The UI
is a React SPA (`platform/web`) routed with React Router. The API lives under
`/api/openpeeps/core/v1/` on `@openpeeps/server` (Riddl endpoints).

## Route Structure

- **Pages**: React components registered in the web router
- **API Routes**: Riddl modules under `platform/server/src/api/`
- **Layouts**: Shared layout components in `@openpeeps/react`
- **Dynamic Routes**: Path params (e.g. `/posts/:postId`, `/@:handle`)

## Route Groups

Routes are organized by access level. Guards in the React app enforce auth;
they do not appear in the URL.

### Protected

Routes that require authentication. All routes under this group require a logged-in user.

#### Conditionally public

Routes that are accessible to authenticated users but may also be viewable by unauthenticated users depending on content visibility settings (e.g., public profiles, public posts, public groups).

**Available routes:**

- `/home` - Home feed
- `/feeds/local` - Local community feed
- `/feeds/my` - Personal feed
- `/explore` - Explore/discover content
- `/@[handle]` - Profile page (e.g., `/@username`)
- `/@[handle]/followers` - Profile followers list
- `/@[handle]/following` - Profile following list
- `/posts/[postId]` - Individual post view
- `/groups` - Groups listing
- `/groups/@[handle]` - Group page
- `/groups/@[handle]/edit` - Edit group (if user has permission)
- `/groups/@[handle]/info` - Group information
- `/groups/@[handle]/members` - Group members list
- `/groups/new` - Create new group
- `/events` - Events listing
- `/events/[eventId]/edit` - Edit event
- `/events/new` - Create new event
- `/jams` - Jams (video calls) listing
- `/articles` - Articles listing
- `/articles/[articleId]/edit` - Edit article
- `/articles/new` - Create new article
- `/tags/[hashtag]` - Hashtag feed
- `/members` - Members directory
- `/about` - About page

#### Private

Routes that are only accessible to authenticated users and are never publicly viewable.

**Available routes:**

- `/settings` - Settings dashboard
  - `/settings/account` - Account settings
  - `/settings/public-profile` - Public profile settings
  - `/settings/notifications` - Notification preferences
  - `/settings/billing` - Billing and subscriptions
  - `/settings/theme` - Theme preferences
- `/conversations` - Direct messages/conversations list
- `/conversations/[id]` - Individual conversation
- `/conversations/[id]/info` - Conversation details
- `/notifications` - Notifications feed
- `/feeds/bookmarks` - Bookmarked posts
- `/events/my` - User's events
- `/jams/my` - User's jams
- `/welcome` - Welcome page for new users
- `/admin` - Admin dashboard
  - `/admin/analytics` - Analytics and statistics
  - `/admin/members` - Member management
  - `/admin/groups` - Group management
  - `/admin/invites` - Invite link management
  - `/admin/moderation` - Moderation tools
    - `/admin/moderation/reports/@[handle]` - Report details
  - `/admin/backups` - Backup management
  - `/admin/configuration` - Server configuration
    - `/admin/configuration/community` - Community settings
      - `/admin/configuration/community/info` - Community information
      - `/admin/configuration/community/about-page` - About page editor
      - `/admin/configuration/community/welcome-page` - Welcome page editor
      - `/admin/configuration/community/welcome-email` - Welcome email template
      - `/admin/configuration/community/theme` - Theme configuration
      - `/admin/configuration/community/roles` - Role management
      - `/admin/configuration/community/profile-fields` - Profile field configuration
      - `/admin/configuration/community/links` - Navigation links
      - `/admin/configuration/community/favicons` - Favicon configuration
    - `/admin/configuration/i18n` - Internationalization settings
    - `/admin/configuration/server-settings` - Server configuration

### Public

Routes that are accessible without login (no ProfileGuard). Used for public jam and guest-join flow.

**Available routes:**

- `/events/[eventId]/jam` - Jam (video call) interface and guest form; public jams are joinable without login.

### `(protected-without-layout)`

Routes that require authentication but don't use the standard layout (e.g., payment success pages, admin tools).

**Available routes:**

- `/payment/success` - Payment success page
- `/admin/db` - In-app Postgres database explorer (`core-db-access`)
- `/admin/diagnostics/logs` - Server logs viewer

## Authentication Routes

### `/auth`

Authentication-related pages that don't require authentication to access.

**Available routes:**

- `/auth/login` - Sign in page
- `/auth/register` - Sign up page
- `/auth/register/invitation` - Sign up with invitation code
- `/auth/request-reset-password` - Request password reset
- `/auth/reset-password` - Reset password with token
- `/auth/closed` - Registration closed message
- `/auth/sso/generic` - Generic SSO authentication
- `/auth/validate-email` - Email validation endpoint

## API Routes

All API endpoints are under `/api/openpeeps/core/v1/`. The API uses [@riddl/core](https://www.npmjs.com/package/@riddl/core) for OpenAPI integration and type-safe endpoints.

### API Structure

API routes follow RESTful conventions and are organized by resource:

```
/api/openpeeps/core/v1/
├── auth/              # Authentication endpoints
├── accounts/          # Account management
├── profiles/          # Profile operations
├── posts/             # Post operations
├── groups/            # Group operations
├── events/            # Event operations
├── jams/              # Jam (video call) operations
├── conversations/     # Direct message operations
├── notifications/     # Notification operations
├── search/            # Search endpoints
├── payments/          # Payment operations
├── admin/             # Admin-only endpoints
└── server/           # Server information
```

### API Endpoint Pattern

API endpoints are Riddl modules under `platform/server/src/api/`. Each HTTP
method is a file that exports `apiEndpoint` (discovered via
`import.meta.glob`). Handlers use `endpoint()` from `#lib/endpoint` and
auth helpers from `#lib/auth`.

Example:

```typescript
// platform/server/src/api/openpeeps/core/v1/posts/[postId]/bookmark/POST.ts
import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findPost, bookmarkPost } from '@openpeeps/core/posts';
import { successResponseSchema } from '@openpeeps/common/types';

export const Param = z.object({
  postId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    const mergedPost = await findPost(input.postId);
    if (!mergedPost) {
      throw notFound(`Object with id ${input.postId}`);
    }
    await ensurePostCapabilities(event, mergedPost, ['core-posts-read']);
    await bookmarkPost(mergedPost, profile);
    return { success: true };
  },
);
```

See `platform/server/README.md` for layout and middleware details.
### Key API Endpoints

#### Authentication

- `POST /api/openpeeps/core/v1/auth/login` - User login
- `POST /api/openpeeps/core/v1/auth/register` - User registration
- `POST /api/openpeeps/core/v1/auth/request-reset-password` - Request password reset
- `POST /api/openpeeps/core/v1/auth/reset-password` - Reset password
- `POST /api/openpeeps/core/v1/auth/guest-pass` - Create guest pass

#### Profiles

- `GET /api/openpeeps/core/v1/profiles` - List profiles
- `GET /api/openpeeps/core/v1/profiles/[profileId]` - Get profile
- `GET /api/openpeeps/core/v1/profiles/by-handle/[handle]` - Get profile by handle
- `GET /api/openpeeps/core/v1/profiles/current` - Get current user's profile
- `PATCH /api/openpeeps/core/v1/profiles/current` - Update current profile
- `POST /api/openpeeps/core/v1/profiles/[profileId]/follow` - Follow profile
- `GET /api/openpeeps/core/v1/profiles/[profileId]/followers` - Get followers
- `GET /api/openpeeps/core/v1/profiles/[profileId]/following` - Get following
- `GET /api/openpeeps/core/v1/profiles/[profileId]/posts` - Get profile posts
- `GET /api/openpeeps/core/v1/profiles/current/settings` - Get profile settings
- `PUT /api/openpeeps/core/v1/profiles/current/settings` - Update profile settings

#### Posts

- `GET /api/openpeeps/core/v1/posts` - List posts
- `POST /api/openpeeps/core/v1/posts` - Create post
- `GET /api/openpeeps/core/v1/posts/[postId]` - Get post
- `PUT /api/openpeeps/core/v1/posts/[postId]` - Update post
- `DELETE /api/openpeeps/core/v1/posts/[postId]` - Delete post
- `POST /api/openpeeps/core/v1/posts/[postId]/react` - React to post
- `POST /api/openpeeps/core/v1/posts/[postId]/bookmark` - Bookmark post
- `DELETE /api/openpeeps/core/v1/posts/[postId]/bookmark` - Unbookmark post
- `POST /api/openpeeps/core/v1/posts/[postId]/reposts` - Repost
- `GET /api/openpeeps/core/v1/posts/[postId]/replies` - Get replies
- `GET /api/openpeeps/core/v1/posts/[postId]/context` - Get conversation context
- `POST /api/openpeeps/core/v1/posts/[postId]/vote` - Vote on poll
- `POST /api/openpeeps/core/v1/posts/[postId]/rsvp` - RSVP to event
- `GET /api/openpeeps/core/v1/posts/feeds/local` - Local feed
- `GET /api/openpeeps/core/v1/posts/feeds/my` - Personal feed
- `GET /api/openpeeps/core/v1/posts/bookmarks` - Bookmarked posts
- `GET /api/openpeeps/core/v1/posts/by-type/[type]` - Posts by type
- `GET /api/openpeeps/core/v1/posts/by-profile/[profileId]` - Posts by profile
- `GET /api/openpeeps/core/v1/posts/by-hashtag/[hashtag]` - Posts by hashtag
- `GET /api/openpeeps/core/v1/posts/by-group/[groupId]` - Posts by group

#### Groups

- `GET /api/openpeeps/core/v1/groups` - List groups
- `POST /api/openpeeps/core/v1/groups` - Create group
- `GET /api/openpeeps/core/v1/groups/[groupId]` - Get group
- `PUT /api/openpeeps/core/v1/groups/[groupId]` - Update group
- `GET /api/openpeeps/core/v1/groups/by-handle/[handle]` - Get group by handle
- `POST /api/openpeeps/core/v1/groups/[groupId]/join` - Join group
- `POST /api/openpeeps/core/v1/groups/[groupId]/leave` - Leave group
- `GET /api/openpeeps/core/v1/groups/[groupId]/members` - Get group members

#### Events and Jams

- `GET /api/openpeeps/core/v1/posts/feeds/events/upcoming` - Upcoming events
- `GET /api/openpeeps/core/v1/posts/feeds/events/current` - Current events
- `GET /api/openpeeps/core/v1/posts/feeds/events/past` - Past events
- `GET /api/openpeeps/core/v1/posts/feeds/jams/upcoming` - Upcoming jams
- `GET /api/openpeeps/core/v1/posts/feeds/jams/past` - Past jams
- `GET /api/openpeeps/core/v1/jams/[eventId]/token` - Get jam access token
- `GET /api/openpeeps/core/v1/jams/[eventId]/state` - Get jam state
- `POST /api/openpeeps/core/v1/jams/[eventId]/events` - Create jam event
- `PUT /api/openpeeps/core/v1/jams/[eventId]/close` - Close jam
- `GET /api/openpeeps/core/v1/jams/[eventId]/waiting-room` - Get waiting room
- `POST /api/openpeeps/core/v1/jams/[eventId]/waiting-room/[profileId]/admit` - Admit to jam
- `POST /api/openpeeps/core/v1/jams/[eventId]/recordings` - Start recording
- `PUT /api/openpeeps/core/v1/jams/[eventId]/recordings/stop` - Stop recording

#### Notifications

- `GET /api/openpeeps/core/v1/profiles/current/notifications` - Get notifications
- `GET /api/openpeeps/core/v1/profiles/current/notifications/[notificationId]` - Get notification
- `POST /api/openpeeps/core/v1/profiles/current/notifications/mark-all-seen` - Mark all as seen
- `GET /api/openpeeps/core/v1/profiles/current/notifications/stats` - Notification stats
- `GET /api/openpeeps/core/v1/profiles/current/notifications/types` - Notification types

#### Search

- `GET /api/openpeeps/core/v1/search/counts` - Get search result counts
- `GET /api/openpeeps/core/v1/search/profiles` - Search profiles
- `GET /api/openpeeps/core/v1/search/posts` - Search posts
- `GET /api/openpeeps/core/v1/search/groups` - Search groups
- `GET /api/openpeeps/core/v1/search/events` - Search events
- `GET /api/openpeeps/core/v1/search/jams` - Search jams

#### Payments

- `POST /api/openpeeps/core/v1/payments/create-checkout` - Create checkout session
- `POST /api/openpeeps/core/v1/payments/create-portal` - Create customer portal
- `GET /api/openpeeps/core/v1/payments/status` - Get payment status
- `GET /api/openpeeps/core/v1/payments/success` - Payment success callback
- `POST /api/openpeeps/core/v1/payments/webhook` - Stripe webhook handler

#### Admin

- `GET /api/openpeeps/core/v1/admin/stats` - Server statistics
- `GET /api/openpeeps/core/v1/admin/stats/signups` - Signup statistics
- `GET /api/openpeeps/core/v1/admin/profiles` - List all profiles
- `GET /api/openpeeps/core/v1/admin/groups` - List all groups
- `GET /api/openpeeps/core/v1/admin/reports` - List reports
- `GET /api/openpeeps/core/v1/admin/reports/[reportId]` - Get report
- `PUT /api/openpeeps/core/v1/admin/reports/[reportId]/resolve` - Resolve report
- `PUT /api/openpeeps/core/v1/admin/reports/[reportId]/reopen` - Reopen report
- `GET /api/openpeeps/core/v1/admin/accounts` - List accounts
- `GET /api/openpeeps/core/v1/admin/accounts/[accountId]` - Get account
- `GET /api/openpeeps/core/v1/admin/accounts/[accountId]/profiles` - Get account profiles
- `GET /api/openpeeps/core/v1/admin/roles` - List roles
- `GET /api/openpeeps/core/v1/admin/roles/[roleId]` - Get role
- `PUT /api/openpeeps/core/v1/admin/roles/[roleId]` - Update role
- `PUT /api/openpeeps/core/v1/admin/profiles/[profileId]/roles` - Update profile roles
- `GET /api/openpeeps/core/v1/admin/db/tables` - List Drizzle schema tables
- `GET /api/openpeeps/core/v1/admin/db/tables/:table/rows` - Browse table rows
- `PUT /api/openpeeps/core/v1/admin/db/tables/:table/rows` - Update a table row
- `GET /api/openpeeps/core/v1/admin/db/tables/:table/export` - Export table CSV
- `POST /api/openpeeps/core/v1/admin/db/sql` - Run arbitrary SQL
- `POST /api/openpeeps/core/v1/admin/server/restart` - Restart server
- `GET /api/openpeeps/core/v1/admin/i18n` - Get i18n data
- `PUT /api/openpeeps/core/v1/admin/i18n/overrides` - Update i18n overrides

### API Documentation

Interactive API documentation is available at `/docs/api/index.html` (when running the development server).

## Media and Storage Routes

### `/storage`

Media files are served from this path. Files are organized by storage provider and ID.

**Route pattern:**

- `/storage/allpeep/[id]/[filename]` - AllPeeP-hosted media files

### `/s3`

S3-compatible storage access.

**Route pattern:**

- `/s3/[bucket]/[filename]` - S3 bucket files

### `/backups`

Database backup downloads.

**Route pattern:**

- `/backups/[backupDir].zip` - Download backup archive

## System Routes

### `/health`

Health check endpoint that returns server status.

**Response:**

```json
{
  "healthy": true
}
```

### `/pwa`

Progressive Web App resources.

- `/pwa/manifest.json` - PWA manifest
- `/pwa/icons/[size].png` - App icons

### `/.well-known`

Well-known URLs for various services.

- `/.well-known/apple-app-site-association` - Apple App Site Association for deep linking

## Dynamic Route Parameters

Web (React Router) and API path params use descriptive names:

- `postId` - Post UUID
- `profileId` - Profile UUID
- `groupId` - Group UUID
- `eventId` - Event UUID (also used for jams)
- `handle` - Profile or group handle (username)
- `hashtag` - Hashtag name
- `type` - Post type (note, question, event, article)
- `notificationId` - Notification UUID
- `conversationId` - Conversation UUID
- `backupDir` - Backup directory name
- `size` - Icon size for PWA icons
- `bucket` - S3 bucket name
- `filename` - File name

On the server, Riddl folders use `[param]` segments (e.g.
`posts/[postId]/GET.ts`); the web app uses React Router `:param` segments.

## Layouts

Shared UI shells live in `@openpeeps/react` / `@openpeeps/web` (app shell,
auth screens, profile guards). They are React components, not filesystem route
groups.

## Best Practices

1. **Route Organization**: Group pages by access level in the web router
2. **Dynamic Routes**: Use descriptive parameter names
3. **API Consistency**: Follow RESTful conventions for API endpoints
4. **Type Safety**: Use @riddl/core / `endpoint()` for type-safe API endpoints
5. **Access Control**: Implement authorization checks in route handlers
6. **Error Handling**: Use consistent error responses (404, 403, etc.)
7. **Documentation**: Keep OpenAPI schemas up to date (`/openapi.json`)

## Examples

### Creating a New Page Route

Register a React page component in `platform/web` (React Router) and navigate
with path params (e.g. `/posts/:postId`). Prefer shared layout components from
`@openpeeps/react` rather than duplicating shells.

### Creating a New API Endpoint

```typescript
// platform/server/src/api/openpeeps/core/v1/my-resource/GET.ts
import { endpoint, z } from '#lib/endpoint';
import { notFound } from '#lib/errors';

export const Param = z.object({
  // Path parameters
});

export const Output = z.object({
  // Response schema
});

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event) => {
    // Endpoint logic — delegate to @openpeeps/core
    return {
      /* response */
    };
  },
);
```

### Accessing Route Parameters

```typescript
// Web (React Router)
import { useParams } from 'react-router-dom';

const { postId } = useParams<{ postId: string }>();
```

```typescript
// API (Riddl handler) — path params are merged into `input` by endpoint()
export const apiEndpoint = endpoint({ Param, Output }).handle(
  async (input) => {
    const { postId } = input;
    // Use postId
  },
);
```
