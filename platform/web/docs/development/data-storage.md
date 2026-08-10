# Data Storage

The OpenPeeps Community Server uses [PostgreSQL](https://www.postgresql.org/) as its primary database and [Redis](https://redis.io/) for caching and event pub/sub.

Schema design and migration rationale are documented in `platform/core/docs/postgres-schema-adr.md`.

## PostgreSQL

PostgreSQL stores documents (accounts, profiles, posts, groups, …) in typed
tables and relationships in edge/join tables. Drizzle ORM defines the schema.

Most existing domain code still loads entities through the document/edge
compatibility layer in `platform/core/src/db/pg/map/`. **New features and
hot-path work should prefer Drizzle / SQL-native queries** (see
[Query style](#query-style)) instead of growing that map DSL.

### Database Connection

Access the database using the `allpeepDb()` function:

```typescript
import { allpeepDb } from '@openpeepshq/core/db';

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

### Schema migrations

Schema (and most stored-shape) changes go through **Drizzle SQL**:

1. Edit table definitions under `platform/core/src/db/pg/schema/`.
2. Generate SQL: `pnpm --filter @openpeepshq/core db:generate` — files land in
   `platform/core/src/db/pg/sql/`.
3. Apply: `pnpm --filter @openpeepshq/core db:migrate` (also runs automatically
   when the server starts).

Rationale and cutover notes: `platform/core/docs/postgres-schema-adr.md` and
`platform/core/docs/postgres-migration-runbook.md`.
`platform/core/src/db/dataMigrations/` is **Arango-era history** used for
cutover export shapes; it is **not** replayed on Postgres and must not receive
new migrations. One-off PG data backfills belong in an intentional SQL
migration or a documented one-shot script.

### Query style

The `pg/map` layer preserves Arango-era document/edge semantics on Postgres
(`filters.ts`, `relations.ts`, `registry.ts`). Keep using it for existing
mappings and call sites.

For **new** reads/writes — especially hot paths, aggregations, or joins that
do not already fit a mapping — prefer:

1. **Drizzle queries** against tables in `platform/core/src/db/pg/schema/`
   (see `platform/core/src/analytics/read.ts`, `platform/core/src/i18n/index.ts`).
2. **Shared SQL helpers** under `platform/core/src/db/pg/queries/` when the
   expression is reused across domains.
3. Expanding the map DSL only when an existing `map()` call site truly needs
   a new filter/relation primitive.

Carving large existing hotspots off `pg/map` is a separate follow-up once
Arango types are gone (see issue #1023).

### Mappings

Mappings describe how to load entities and their relations for call sites that
still use the document/edge API. They are built with `map()` from
`platform/core/src/db/pg/map/`:

```typescript
import { map } from '@openpeepshq/core/db';
import { PostData } from '@openpeepshq/common/types';

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

Admins with the `core-db-access` capability can use the in-app explorer at
`/admin/db` to browse and edit Drizzle schema tables, export CSV, and run SQL.

Optional local tools:

- **Drizzle Studio** — `pnpm --filter @openpeepshq/core db:studio`
- **`psql`** — connect with `DATABASE_URL`

## Redis

Redis is used for:

1. **Event Pub/Sub** — distributed event system for cross-service communication
2. **Caching** — temporary storage for frequently accessed data

### Redis Connection

```typescript
import { getSharedConnection } from '@openpeepshq/core/redis';

const redis = await getSharedConnection();
```

### Event System

```typescript
import { hub } from '@openpeepshq/core/events';

hub.emit('postCreated', transformedPost);

hub.on('postCreated', (post: PostWithMeta) => {
  // Handle post creation
});
```

Events are namespaced with the Redis pub/sub prefix `allpeep:core:` (kept for compatibility with existing workers/clients; rename to `openpeeps:core:` when all consumers can migrate together). Logger namespaces use `openpeeps:`.

### Caching

Stripe subscription data and jam state are cached in Redis. Cache keys follow
consistent prefixes (e.g. `stripe-customer-sub:{customerId}`).

### Redis Configuration

- `REDIS_HOST` — Redis server hostname (default: `localhost`)
- Port defaults to `6379`

Configuration is defined in `platform/core/src/config/defaults/redis.ts`.

## Best Practices

### PostgreSQL

1. **Prefer SQL-native for new work** — Drizzle / `db/pg/queries` over expanding
   the map DSL; keep `map()` for existing entity loaders
2. **Index query paths** — add Drizzle indexes for frequently filtered columns
3. **Soft deletes** — use `softDelete: true` on mappings (or `deleted_at` filters
   in SQL) for audit trails
4. **Batch work** — use `Promise.all()` for independent parallel operations

### Redis

1. **Key naming** — use consistent key prefixes
2. **TTL** — set appropriate TTLs for cached data
3. **Error handling** — handle Redis connection errors gracefully
4. **Event namespacing** — use namespaced event types to avoid collisions
