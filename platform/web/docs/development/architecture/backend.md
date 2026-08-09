# Backend Architecture

The OpenPeeps backend is organized into modular packages that handle business logic, API endpoints, background jobs, and administrative tasks.

## Backend Components

### Core Package

The heart of the backend, containing all business logic and data access.

**Location**: `platform/core/`

**Package**: `@openpeeps/core`

**Responsibilities:**

- Domain models (Posts, Profiles, Groups, Jams, etc.)
- Database operations (PostgreSQL via Drizzle / `pg/map`)
- Business logic (mutations, finders, helpers)
- Event system (Redis pub/sub)
- External service integrations (Stripe, LiveKit, email)

**Structure:**

```
core/
├── src/
│   ├── posts/          # Post domain logic
│   │   ├── mutations.ts
│   │   ├── finders.ts
│   │   ├── mapping.ts
│   │   └── helpers/
│   ├── profiles/       # Profile domain logic
│   ├── groups/         # Group domain logic
│   ├── jams/           # Jam (video call) logic
│   ├── notifications/  # Notification system
│   ├── db/             # Database setup and helpers
│   ├── stripe/         # Payment processing
│   ├── email/           # Email sending
│   ├── redis/          # Redis connection
│   ├── events/         # Event system
│   └── config/         # Configuration
```

**Key Patterns:**

- **Mutations**: Create, update, delete operations
- **Finders**: Query and retrieval operations
- **Mapping**: Database query builders
- **Helpers**: Utility functions

**Example:**

```typescript
import { createPost, findPost } from '@openpeeps/core/posts';

// Create a post
const post = await createPost(data, profile, postData, relations);

// Find a post
const post = await findPost(postId);
```

### Application Server

The HTTP API and static SPA host built on Express + Riddl.

**Location**: `platform/server/`

**Package**: `@openpeeps/server`

**Responsibilities:**

- HTTP request handling
- API route definitions (Riddl endpoints under `/api/openpeeps/core/v1`)
- Authentication middleware
- File / media serving
- React Email template registration
- BullMQ worker entrypoint (`src/worker.ts`)

**Key Files:**

- `src/api/` - Riddl API endpoint modules
- `src/lib/` - Server utilities (auth, middleware, streaming, S3, PWA)
- `src/emails/` - React Email templates
- `src/server.ts` - Express boot
- `src/worker.ts` - BullMQ worker boot

**API Structure:**

```
src/api/openpeeps/core/v1/
├── posts/
│   ├── [postId]/
│   │   └── GET.ts / POST.ts / …
│   └── GET.ts
├── profiles/
├── groups/
└── ...
```

**Endpoint Definition Pattern:**

```typescript
// src/api/.../GET.ts
import { Endpoint, z } from '@riddl/core';
export const Param = z.object({...});
export const Output = schema;
export default new Endpoint({ Param, Output }).handle(async (input, event) => {
  // Logic here
});
```

### Worker

Background job processor for asynchronous tasks.

**Location**: `platform/worker/`

**Package**: `@openpeeps/worker`

**Responsibilities:**

- Email sending
- Media processing
- Scheduled tasks
- Long-running operations

**Technology:**

- BullMQ - Job queue management
- Redis - Queue storage

**Usage:**

```typescript
import { worker } from '@openpeeps/worker';

// Jobs are automatically processed
// when added to queues in @openpeeps/core
```

### CLI

Command-line interface for administrative tasks.

**Location**: `platform/cli/`

**Package**: `@openpeeps/cli`

**Commands:**

- Database management
- Account operations
- Profile management
- Backup/restore
- Secret management
- Email testing

**Usage:**

```bash
./apc db clear
./apc accounts create
./apc profiles list
```

## Backend Architecture Patterns

### Domain-Driven Design

The backend follows domain-driven design principles:

- **Domains**: Posts, Profiles, Groups, Jams, etc.
- **Each domain has**:
  - `mutations.ts` - Write operations
  - `finders.ts` - Read operations
  - `mapping.ts` - Database mappings
  - `helpers/` - Domain-specific utilities

### Database Access

**Pattern:**

```typescript
import { allpeepDb } from '@openpeeps/core/db';

const { db } = await allpeepDb();
const post = await postsMapping.find(db, postId);
```

**Mappings:**

- Type-safe query builders
- Automatic relation loading
- Soft delete support
- Filter and sort capabilities

### Event System

**Redis Pub/Sub:**

```typescript
import { hub } from '@openpeeps/core/events';

// Emit event
hub.emit('postCreated', post);

// Subscribe to event
hub.on('postCreated', (post) => {
  // Handle event
});
```

### Authentication & Authorization

**Pattern:**

```typescript
import {
  ensureLocalProfile,
  ensurePostCapabilities,
  ensureRoleCapabilities,
} from '$lib/server/auth';

// In API endpoint (handler must be async)
const profile = await ensureLocalProfile(event);
await ensurePostCapabilities(event, post, ['core-posts-read']);

// Or a single call when you only need role checks (returns profile; includes subscription gate)
// const profile = await ensureRoleCapabilities(event, ['core-analytics-read']);
```

**Capabilities:**

- Role-based access control
- Resource-specific permissions
- Service account support

### Error Handling

**Consistent errors:**

```typescript
import { notFound, forbidden, badRequest } from '$lib/server/api/errors';

if (!post) {
  throw notFound(`Post with id ${postId}`);
}

if (!hasPermission) {
  throw forbidden();
}
```

## External Integrations

### Stripe

Payment processing for subscriptions:

- Customer management
- Subscription handling
- Webhook processing
- Portal access

**Location**: `platform/core/src/stripe/`

### LiveKit

Real-time video/audio for jams:

- Room management
- Token generation
- Recording
- Participant management

**Location**: `platform/core/src/jams/livekit.ts`

### Email

Email sending via SMTP:

- Template rendering
- Queue-based sending
- HTML and text versions

**Location**: `platform/core/src/email/`

### Media Processing

- Image processing (Sharp)
- Video processing (FFmpeg)
- Background removal (Greenscreen library)

## Data Flow

### Request Flow

```
1. HTTP Request → Express / Riddl route handler
2. Authentication Check → await ensureLocalProfile()
3. Authorization Check → await ensurePostCapabilities()
4. Business Logic → @openpeeps/core domain functions
5. Database Access → Postgres (and legacy Arango mappings where present)
6. Response → JSON (SPA HTML is served by the static catch-all)
```

### Event Flow

```
1. Domain Action → hub.emit('eventName', data)
2. Redis Pub/Sub → Event published to Redis
3. Subscribers → hub.on('eventName', handler)
4. Background Jobs → Worker processes if needed
```

## Configuration

**Environment variables** (see `.env.dev.example` for a fuller list):

- `JWT_SECRET` — required in production; random fallback is cryptographically
  fine for a single local process but breaks multi-instance / restart
  consistency (server warns or fails fast accordingly)
- Database (`DATABASE_URL`, optional legacy `DB_URL` / `DB_NAME`)
- Redis (`REDIS_HOST`, `REDIS_PORT`)
- `SERVER_HOST` / `SERVER_PROTOCOL` — public hostname for links and prod CORS
- `CORS_ORIGINS` — optional comma-separated API allowlist (defaults from
  `SERVER_HOST` in production, `http://localhost:5174` locally)
- Stripe, LiveKit, SMTP, VAPID, media storage — leave unset until needed;
  LiveKit has no default URL (jams stay disabled until URL + keys are set)
- `SENTRY_DSN` — optional; Sentry stays disabled (`enabled: false`) when
  unset or empty. There is no hardcoded default DSN, so self-hosted
  instances do not send errors to a shared project unless operators
  configure their own DSN

**Configuration files:**

- `platform/core/src/config/defaults/` - Default configurations
- Environment-specific overrides via `.env`

## Testing

**Backend Testing:**

- Unit tests for domain logic
- Integration tests for API endpoints
- Database tests with test database

**Test Database:**

```bash
DB_NAME=test pnpm test
```

## Performance Considerations

1. **Database Queries**: Use mappings for efficient queries
2. **Caching**: Redis for frequently accessed data
3. **Background Jobs**: Offload heavy operations to worker
4. **Connection Pooling**: Reuse database connections
5. **Indexing**: Proper PostgreSQL indexes for query paths

## Security

1. **Authentication**: JWT-based authentication (`JWT_SECRET` must be stable
   and shared across API/worker replicas)
2. **Authorization**: Capability-based access control
3. **Input Validation**: Zod schemas for all inputs
4. **SQL Injection**: Parameterized queries via Drizzle / the query layer
5. **XSS Prevention**: Content sanitization
6. **CSRF Protection**: Same-origin SPA + Bearer JWT (no cookie session CSRF surface)
7. **CORS**: API allowlist via `CORS_ORIGINS` / `SERVER_HOST` (not `*`)
8. **Edge rate limiting**: Prefer Traefik/CDN limits on `/api/.../auth/*`
   (login, register, password reset) and anonymous public GETs; the app does
   not ship in-process rate limits

## Best Practices

1. **Domain Logic**: Keep business logic in `@openpeeps/core`
2. **API Layer**: Thin layer, delegate to core
3. **Error Handling**: Use consistent error responses
4. **Type Safety**: Use TypeScript and Zod throughout
5. **Testing**: Write tests for critical paths
6. **Documentation**: Document API endpoints with OpenAPI
7. **Logging**: Use structured logging
8. **Monitoring**: Track errors and performance

## Related Documentation

- [Data Storage](/docs/development/data-storage) - Database patterns
- [Routes](/docs/development/routes) - API endpoint structure
- [Code Style](/docs/development/code-style) - Backend coding standards
- [Frontend Architecture](/docs/development/architecture/frontend) - Client-side architecture
- [Realtime Architecture](/docs/development/architecture/realtime) - HTTP, LiveKit, SSE, hub/queues, push
