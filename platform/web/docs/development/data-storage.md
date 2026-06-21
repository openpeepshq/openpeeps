# Data Storage

The AllPeeP Community Server uses [ArangoDB](https://arangodb.com/community-server/) as its primary database and [Redis](https://redis.io/) for caching and event pub/sub. Profiles with a role containing the capability `allpeep-core-admin-database` can access the database's [web frontend](/admin/db).

## ArangoDB

ArangoDB is a multi-model database that supports document, graph, and key-value data models. The AllPeeP platform uses ArangoDB primarily as a graph database to model relationships between entities like profiles, posts, groups, and hashtags.

### Database Connection

Access the database using the `allpeepDb()` function:

```typescript
import { allpeepDb } from '@openpeeps/core/db';

const { db } = await allpeepDb();
```

### Collections

Collections in ArangoDB can be either **document collections** (for entities) or **edge collections** (for relationships). The platform defines collections in `platform/core/src/db/structure/collections.ts`.

#### Document Collections

Document collections store entities like:

- `accounts` - User accounts
- `profiles` - User profiles
- `posts` - Posts and content
- `groups` - Groups/communities
- `hashtags` - Hashtags
- `notifications` - Notifications
- `roles` - Role definitions
- `configs` - Configuration data

#### Edge Collections

Edge collections represent relationships between entities:

- `follows` - Profile follows another profile
- `entries` - Profile created/edited/deleted a post
- `reactions` - Profile reacted to a post
- `replies` - Post replies to another post
- `repost` - Post reposts another post
- `mentions` - Post mentions a profile
- `audience` - Post has specific audience
- `postHashtags` - Post has a hashtag
- `postGroups` - Post belongs to a group
- `userGroups` - Profile belongs to a group
- `bookmarks` - Profile bookmarked a post
- `controls` - Profile controls another profile (admin relationship)

### Indices

Collections use various index types for performance:

- **Persistent indices**: For unique constraints and lookups (e.g., unique emails, unique handles)
- **Inverted indices**: For full-text search on profiles, posts, and groups

Example from collections definition:

```typescript
profilesCollection: {
  name: 'profiles',
  indices: [
    {
      type: 'persistent',
      fields: ['handle', 'activityPub.domain'],
      name: 'unique-activityPub-identifiers',
      unique: true,
    },
    {
      type: 'inverted',
      fields: ['handle', 'bio', 'displayName', 'location.text', 'fields[*].value'],
      analyzer: 'text_en',
      name: 'search-profiles',
    }
  ],
}
```

### Mappings

Mappings are query builders that define how to retrieve and transform data from ArangoDB. They use the `@openpeeps/arango-querybuilder` library.

#### Creating a Mapping

```typescript
import { map, Mapping } from '@openpeeps/arango-querybuilder';
import { PostData } from '@openpeeps/common/types';

export const postsMapping = map<PostData, DbPost>({
  collection: 'posts',
  softDelete: true,
  relations: [
    /* relation definitions */
  ],
});
```

#### Using Mappings

```typescript
import { postsMapping } from './mapping';
import { allpeepDb } from '../db';

// Find a single post
const post = await postsMapping.find(db, postId);

// Create a post
const newPost = await postsMapping.create(db, postData);

// Update a post
await postsMapping.update(db, postId, { data: updatedData });

// Delete a post
await postsMapping.delete(db, postId);

// Query with filters
const filteredPosts = await postsMapping
  .filter({ matches: { type: 'note' } })
  .all(db);
```

### Relations

Relations define how to traverse the graph to fetch related entities. Relations can be:

- **OUTBOUND**: From the source vertex to target vertices
- **INBOUND**: From target vertices to the source vertex
- **Cardinality**: `one` or `many`

Example relation definition:

```typescript
const reactionsRelation: Relation = {
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

#### Using Relations

```typescript
// Get posts with their reactions
const postsWithReactions = await postsMapping
  .relationsFrom(post, reactionsRelation)
  .all(db);

// Traverse relations from a profile
const profilePosts = await profilesMapping.relationsFrom(profile, {
  alias: 'posts',
  edgeCollection: 'entries',
  direction: 'OUTBOUND',
  edgeFilter: 'DOC.type == "create"',
  skipEdge: true,
  cardinality: 'many',
  mapping: postsMapping.data(),
});
```

### Graph Queries

ArangoDB's graph capabilities allow complex traversals:

```typescript
// Get conversation context (ancestors and descendants)
export const contextRelation = (
  depth: number,
  direction: 'ancestors' | 'descendents',
  contextMapping: Mapping<DbPost> = postsMapping,
): RelationWithMapping<DbPost> => ({
  alias: 'context',
  edgeCollection: 'replyTo',
  direction: direction === 'ancestors' ? 'OUTBOUND' : 'INBOUND',
  maxDepth: depth,
  cardinality: 'many',
  skipEdge: true,
  mapping: contextMapping.data(),
});
```

### Connectors and Disconnectors

Helper functions for creating and removing relationships:

```typescript
import { connector, disconnector } from '../db/helpers';

// Create a relationship
const reactionConnector = connector(
  profilesCollectionInfo,
  postsCollectionInfo,
  reactionsCollectionInfo,
);

await reactionConnector(db, profile, post, { reaction: '👍' });

// Remove a relationship
const reactionDisconnector = disconnector(
  profilesCollectionInfo,
  postsCollectionInfo,
  reactionsCollectionInfo,
);

await reactionDisconnector(db, profile, post);
```

### Query Patterns

#### Filtering

```typescript
// Filter by exact match
postsMapping.filter({ matches: { type: 'note' } });

// Filter by expression
postsMapping.filter('DOC.visibility != "direct"');

// Combine filters
postsMapping.filter({
  operator: '&&',
  predicates: [
    { matches: { type: 'event' } },
    { expression: 'DOC.data.start > DATE_ISO8601(DATE_NOW())' },
  ],
});
```

#### Sorting

```typescript
// Sort by key (newest first)
postsMapping.sort([['DOC._key', 'DESC']]);

// Sort by data field
postsMapping.sort([['DOC.data.start', 'ASC']]);
```

#### Pagination

```typescript
// Chronological pagination (using _key)
const addStart = <T extends object>(
  mapping: Mapping<T>,
  start?: string,
): Mapping<T> => filterBefore(sortNewestFirst(mapping), start);

// Offset pagination
postsMapping.limit([offset, limit]);
```

### Soft Deletes

The platform uses soft deletes by checking the `deletedAt` field:

```typescript
{
  collection: 'posts',
  softDelete: true, // Automatically filters out deleted documents
}
```

### Computed Values

Collections automatically add `createdAt` and `updatedAt` timestamps using ArangoDB's computed values feature.

## Redis

Redis is used for:

1. **Event Pub/Sub**: Distributed event system for cross-service communication
2. **Caching**: Temporary storage for frequently accessed data

### Redis Connection

```typescript
import { getSharedConnection } from '@openpeeps/core/redis';

const redis = await getSharedConnection();
```

### Event System

The platform uses Redis pub/sub for event-driven architecture. Events are published and subscribed to using the `hub` object:

```typescript
import { hub } from '@openpeeps/core/events';

// Emit an event
hub.emit('postCreated', transformedPost);
hub.emit('reactionCreated', profile, post, { type: 'reaction', ...data });

// Subscribe to events
hub.on('postCreated', (post: PostWithMeta) => {
  // Handle post creation
});
```

Events are namespaced with the prefix `allpeep:core:` to avoid collisions.

### Caching

#### Stripe Subscription Cache

Stripe subscription data is cached in Redis to reduce API calls:

```typescript
import {
  syncStripeDataToRedis,
  getUserStripeSubscription,
} from '@openpeeps/core/stripe/cache';

// Sync and cache Stripe data
const subData = await syncStripeDataToRedis(customerId);

// Retrieve cached data
const cached = await getUserStripeSubscription(customerId);
```

Cache keys follow the pattern: `stripe-customer-sub:{customerId}`

#### Jam State Cache

Jam (video call) state is cached using `cache-manager`:

```typescript
import { createCache } from 'cache-manager';

export const jamStateCache = createCache({
  ttl: 20 * 1000, // 20 seconds
  refreshThreshold: 5 * 1000, // Refresh if less than 5 seconds remaining
});

export const getJamState = async (jam: PostWithMeta) =>
  jamStateCache.wrap(jam.id, () => jamState(jam));
```

### Redis Memory Analysis

The platform includes a tool to analyze Redis memory usage:

```bash
pnpm redis:memory
```

This scans all Redis keys and displays memory usage organized by key prefixes.

### Redis Configuration

Redis connection is configured via environment variables:

- `REDIS_HOST`: Redis server hostname (default: `localhost`)
- Redis port defaults to `6379`

Configuration is defined in `platform/core/src/config/defaults/redis.ts`.

## Best Practices

### ArangoDB

1. **Use Mappings**: Always use mapping objects rather than raw AQL queries for type safety and consistency
2. **Leverage Relations**: Use relations to traverse the graph efficiently
3. **Index Appropriately**: Add indices for frequently queried fields
4. **Soft Deletes**: Use soft deletes for audit trails and data recovery
5. **Batch Operations**: Use `Promise.all()` for parallel operations when possible

### Redis

1. **Key Naming**: Use consistent key prefixes (e.g., `stripe-customer-sub:`)
2. **TTL**: Always set appropriate TTLs for cached data
3. **Error Handling**: Handle Redis connection errors gracefully
4. **Memory Management**: Monitor Redis memory usage regularly
5. **Event Namespacing**: Use namespaced event types to avoid collisions

## Examples

### Creating a Post with Relations

```typescript
export const createPost = async (
  data: PostDataUnion,
  profile: Profile,
  postData: PostData,
  relations: {
    inReplyToId?: string | null;
    repostId?: string;
    mentions?: MentionWithPublicProfile[] | null;
  } = {},
): Promise<PostWithMeta> => {
  const { db } = await allpeepDb();

  // Create the post
  const post = await postsMapping
    .removeDefaultFilter()
    .create(db, { ...postData, data, type: data.type, creatorId: profile.id });

  // Create entry relation (profile -> post)
  await entryConnector(db, profile, post, {
    type: 'create',
    data,
  });

  // Create reply relation if replying
  if (relations.inReplyToId) {
    const repliedToPost = await postsMapping.find(db, relations.inReplyToId);
    if (repliedToPost) {
      await replyConnector(db, post, repliedToPost);
    }
  }

  // Create mention relations
  if (relations.mentions) {
    await Promise.all(
      relations.mentions.map(async (mention) =>
        mentionConnector(db, post, mention.profile, { text: mention.text }),
      ),
    );
  }

  // Emit event
  const newPost = await postsMapping.find(db, post.id);
  const transformedPost = await transformPost(newPost!);
  hub.emit('postCreated', transformedPost);

  return transformedPost;
};
```

### Querying Posts with Filters

```typescript
export const listPostsByType = async (
  profile: ProfileWithMeta | undefined,
  type: PostType,
  {
    start,
    limit = 100,
    filter,
  }: { start?: string; limit?: number; filter?: OMFilter<DbBasePost> } = {
    limit: 100,
  },
) =>
  toFilteredPostsList(
    baseFeed({ start }).filter(filter).filter({ matches: { type } }),
    { profile, limit },
  );
```

### Using Redis for Event Handling

```typescript
// In a service that needs to react to post creation
hub.on('postCreated', async (post: PostWithMeta) => {
  // Send notification, update search index, etc.
  await sendNotification(post);
  await updateSearchIndex(post);
});
```
