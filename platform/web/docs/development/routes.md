# Routes

An overview of the available routes in the AllPeeP application. The application uses [SvelteKit](https://kit.svelte.dev/) for routing, which provides file-based routing with support for dynamic routes, route groups, and API endpoints.

## Route Structure

SvelteKit uses a file-based routing system where:

- **Pages**: `+page.svelte` files render HTML pages
- **API Routes**: `+server.ts` files handle HTTP requests (GET, POST, PUT, DELETE, etc.)
- **Layouts**: `+layout.svelte` files wrap child routes
- **Route Groups**: Parentheses `()` create route groups that don't affect the URL
- **Dynamic Routes**: Square brackets `[]` create dynamic route parameters

## Route Groups

Route groups organize routes by access level and layout requirements. They don't appear in the URL but affect which layouts and guards are applied.

### `(protected)`

Routes that require authentication. All routes under this group require a logged-in user.

#### `(protected)/(conditionally-public)`

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

#### `(protected)/(private)`

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

### `(public)`

Routes that are accessible without login (no ProfileGuard). Used for public jam and guest-join flow.

**Available routes:**

- `/events/[eventId]/jam` - Jam (video call) interface and guest form; public jams are joinable without login.

### `(protected-without-layout)`

Routes that require authentication but don't use the standard layout (e.g., payment success pages, admin tools).

**Available routes:**

- `/payment/success` - Payment success page
- `/admin/db` - Database admin interface (pgweb, embedded iframe)
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

All API endpoints are under `/api/openpeeps/core/v1/`. The API uses [sveltekit-api](https://github.com/xiroV/sveltekit-api) for OpenAPI integration and type-safe endpoints.

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

API endpoints are defined in two places:

1. **Route handler**: `routes/api/.../+server.ts` - Handles HTTP methods
2. **Endpoint definition**: `api/api/.../METHOD.ts` - Defines OpenAPI schema and logic

Example endpoint structure:

```typescript
// routes/api/openpeeps/core/v1/posts/[postId]/bookmark/+server.ts
import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const POST = async (event: RequestEvent) => api.handle(event);
export const DELETE = async (event: RequestEvent) => api.handle(event);
```

```typescript
// api/api/openpeeps/core/v1/posts/[postId]/bookmark/POST.ts
import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';

export const Param = z.object({
  postId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    // … load post, then e.g. await ensurePostCapabilities(event, post, ['core-posts-read'])
  },
);
```

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
- `GET /api/openpeeps/core/v1/admin/db/token` - Get database access token
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

### `/_db`

Authenticated proxy to the pgweb Postgres browser (requires `db-admin` JWT).

- `/_db` - pgweb UI (proxied when `PGWEB_URL` is set)

## Dynamic Route Parameters

Routes use square brackets `[]` to define dynamic parameters:

- `[postId]` - Post UUID
- `[profileId]` - Profile UUID
- `[groupId]` - Group UUID
- `[eventId]` - Event UUID (also used for jams)
- `[handle]` - Profile or group handle (username)
- `[hashtag]` - Hashtag name
- `[type]` - Post type (note, question, event, article)
- `[notificationId]` - Notification UUID
- `[conversationId]` - Conversation UUID
- `[backupDir]` - Backup directory name
- `[size]` - Icon size for PWA icons
- `[bucket]` - S3 bucket name
- `[filename]` - File name
- `[...aardvarkPath]` - Catch-all for ArangoDB paths

## Route Layouts

Layouts wrap child routes and provide shared UI components:

- **Root layout** (`+layout.svelte`) - App-wide layout with navigation
- **Auth layout** (`auth/+layout.svelte`) - Authentication pages layout
- **Protected layout** (`(protected)/(private)/+layout.svelte`) - Private routes with ProfileGuard
- **Conditionally public layout** (`(protected)/(conditionally-public)/+layout.svelte`) - Public/private routes

## Best Practices

1. **Route Organization**: Use route groups to organize routes by access level
2. **Dynamic Routes**: Use descriptive parameter names in square brackets
3. **API Consistency**: Follow RESTful conventions for API endpoints
4. **Type Safety**: Use sveltekit-api for type-safe API endpoints
5. **Access Control**: Implement authorization checks in route handlers
6. **Error Handling**: Use consistent error responses (404, 403, etc.)
7. **Documentation**: Keep API documentation up to date with OpenAPI schemas

## Examples

### Creating a New Page Route

```svelte
<!-- routes/(protected)/(conditionally-public)/my-page/+page.svelte -->
<script lang="ts">
  // Page component
</script>

<div>
  <h1>My Page</h1>
</div>
```

### Creating a New API Endpoint

```typescript
// routes/api/openpeeps/core/v1/my-resource/+server.ts
import api from '$api';
import type { RequestEvent } from '@sveltejs/kit';

export const GET = async (event: RequestEvent) => api.handle(event);
export const POST = async (event: RequestEvent) => api.handle(event);
```

```typescript
// api/api/openpeeps/core/v1/my-resource/GET.ts
import { Endpoint, z } from 'sveltekit-api';
import { notFound } from '$lib/server/api/errors';

export const Param = z.object({
  // Parameters
});

export const Output = z.object({
  // Response schema
});

export const Error = {
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (input, event) => {
    // Endpoint logic
    return {
      /* response */
    };
  },
);
```

### Accessing Route Parameters

```typescript
// In +page.svelte or +page.ts
import { page } from '$app/state';

let postId = $derived(page.params.postId);
```

```typescript
// In +server.ts
export const GET = async (event: RequestEvent) => {
  const { postId } = event.params;
  // Use postId
};
```
