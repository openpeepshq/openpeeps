# Data Storage

The OpenPeeps Community Server uses [PostgreSQL](https://www.postgresql.org/) as its primary database and [Redis](https://redis.io/) for caching and event pub/sub.

Schema design and migration rationale are documented in `platform/core/docs/postgres-schema-adr.md`.

## PostgreSQL

PostgreSQL stores documents (accounts, profiles, posts, groups, …) in typed tables and relationships in edge/join tables. Drizzle ORM defines the schema; domain code reads and writes through the `pg/map` query layer in `platform/core/src/db/pg/map/`.

### Database Connection

Access the database using the `allpeepDb()` function:

```typescript
import { allpeepDb } from '@openpeeps/core/db';

const { db } = await allpeepDb();
```

Connection is configured via `DATABASE_URL` (default:
`postgresql://openpeeps:openpeeps@localhost:5432/openpeeps`). Drizzle SQL
migrations run automatically when the server starts.

### Schema

Drizzle table definitions live under `platform/core/src/db/pg/schema/`. Document
tables hold scalar columns plus JSONB payloads where needed; edge tables use
`from_id`, `to_id`, and optional `data` JSONB. Full-text search uses
`search_vector` `tsvector` columns with GIN indexes on `profiles`, `posts`, and
`groups`, maintained by database triggers.

Collection and edge names used by mappings are defined in
`platform/core/src/db/pg/collections.ts`, aligned with the Drizzle schema
registries in `platform/core/src/db/pg/map/registry.ts`.

### Mappings

Mappings describe how to load entities and their relations. They are built with
`map()` from `platform/core/src/db/pg/map/`:

```typescript
import { map } from '@openpeeps/core/db/pg/map';
import { PostData } from '@openpeeps/common/types';

export const postsMapping = map<PostData, DbPost>({
  collection: 'posts',
  softDelete: true,
  relations: [/* relation definitions */],
});
```

#### Using Mappings

```typescript
import { postsMapping } from './mapping';
import { allpeepDb } from '../db';

const { db } = await allpeepDb();

const post = await postsMapping.find(db, postId);
const newPost = await postsMapping.create(db, postData);
await postsMapping.update(db, postId, { data: updatedData });
await postsMapping.delete(db, postId);

const filteredPosts = await postsMapping
  .filter({ matches: { type: 'note' } })
  .all(db);
```

### Relations

Relations load linked entities via edge tables (formerly Arango edge collections):

```typescript
const reactionsRelation = {
  alias: 'reactions',
  vertexAlias: 'profile',
  edgeCollection: 'reactions',
  direction: 'INBOUND',
  cardinality: 'many',
  mapping: {
    collection: 'profiles',
    softDelete: true,
  },
};
```

```typescript
const postsWithReactions = await postsMapping
  .relationsFrom(post, reactionsRelation)
  .all(db);
```

### Filtering, Sorting, and Pagination

```typescript
postsMapping.filter({ matches: { type: 'note' } });
postsMapping.sort([['createdAt', 'DESC']]);
postsMapping.limit([offset, limit]);
```

Keyset pagination uses entity ids (UUIDv7), e.g. `filterBefore(sortNewestFirst(mapping), start)`.

### Soft Deletes

Mappings with `softDelete: true` exclude rows where `deleted_at` is set.

### Admin Access

Admins with the `core-db-access` capability can use the in-app Postgres browser
at `/admin/db`. The server proxies `/_db/*` to **pgweb** when `PGWEB_URL` is
set (see `.env.dev.example`). Authentication uses the existing
`GET /api/openpeeps/core/v1/admin/db/token` endpoint and a short-lived
`db-admin` JWT cookie.

- **pgweb** — `docker compose up -d postgres pgweb`, set
  `PGWEB_URL=http://127.0.0.1:8081`, open `/admin/db`
- **Drizzle Studio** — `pnpm --filter @openpeeps/core db:studio` (schema-aware
  dev tool)
- **`psql`** — connect with `DATABASE_URL`

In production, run pgweb with `--readonly` on the internal network only; do not
expose port 8081 publicly.

## Redis

Redis is used for:

1. **Event Pub/Sub** — distributed event system for cross-service communication
2. **Caching** — temporary storage for frequently accessed data

### Redis Connection

```typescript
import { getSharedConnection } from '@openpeeps/core/redis';

const redis = await getSharedConnection();
```

### Event System

```typescript
import { hub } from '@openpeeps/core/events';

hub.emit('postCreated', transformedPost);

hub.on('postCreated', (post: PostWithMeta) => {
  // Handle post creation
});
```

Events are namespaced with the prefix `allpeep:core:` to avoid collisions.

### Caching

Stripe subscription data and jam state are cached in Redis. Cache keys follow
consistent prefixes (e.g. `stripe-customer-sub:{customerId}`).

### Redis Configuration

- `REDIS_HOST` — Redis server hostname (default: `localhost`)
- Port defaults to `6379`

Configuration is defined in `platform/core/src/config/defaults/redis.ts`.

## Best Practices

### PostgreSQL

1. **Use mappings** — prefer `map()` over ad-hoc SQL for type safety
2. **Index query paths** — add Drizzle indexes for frequently filtered columns
3. **Soft deletes** — use `softDelete: true` for audit trails
4. **Batch work** — use `Promise.all()` for independent parallel operations

### Redis

1. **Key naming** — use consistent key prefixes
2. **TTL** — set appropriate TTLs for cached data
3. **Error handling** — handle Redis connection errors gracefully
4. **Event namespacing** — use namespaced event types to avoid collisions
