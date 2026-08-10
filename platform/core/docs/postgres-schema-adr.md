# ADR: PostgreSQL schema for OpenPeeps

## Status

Accepted — replaces ArangoDB as the primary data store.

## Context

OpenPeeps stores application state in ArangoDB as documents and edges, queried via
`@openpeepshq/arango-querybuilder`. We migrate to PostgreSQL with Drizzle ORM and a
one-time offline cutover per instance.

Redis remains unchanged (queues, pub/sub, cache).

## Decision

### IDs and timestamps

- Primary keys: UUIDv7 strings (same values as Arango `_key` for migration parity)
- All entities: `created_at`, `updated_at` (timestamptz, ISO strings in app layer)
- Soft delete: nullable `deleted_at` where Arango mappings used `softDelete: true`

### Document tables

| Table                | Indexed columns                                   | JSONB payload                                   |
| -------------------- | ------------------------------------------------- | ----------------------------------------------- |
| `accounts`           | `email` (unique)                                  | — (scalar columns for query paths)              |
| `profiles`           | `handle`, `activity_pub_domain` (unique together) | profile fields, avatar, bio, activityPub extras |
| `posts`              | `type`, `visibility`, `creator_id`                | `data` (post body union)                        |
| `groups`             | `handle` (unique)                                 | displayName, description, rules, settings       |
| `hashtags`           | `name` (unique, normalized lowercase)             | —                                               |
| `roles`              | `key` (unique)                                    | capabilities, displayName, description          |
| `configs`            | `key` (PK)                                        | config tree                                     |
| `i18n`               | `locale`, `namespace`                             | translations                                    |
| `notifications`      | `profile_id`, `created_at`                        | notification payload                            |
| `reports`            | —                                                 | report data + resolution                        |
| `access_tokens`      | —                                                 | token metadata                                  |
| `push_subscriptions` | —                                                 | subscription payload                            |
| `invite_links`       | `slug` (unique)                                   | link config                                     |
| `jam_events`         | `post_id`                                         | event payload                                   |
| `media_attachments`  | —                                                 | attachment metadata                             |
| `processing_stats`   | `filetype`, `filesize`                            | stats                                           |
| `profile_settings`   | `profile_id` (unique)                             | settings blob                                   |
| `data_migrations`    | `id` (UUIDv7)                                     | applied_at                                      |

### Edge tables (join tables)

Each former Arango edge collection becomes a table with `from_id`, `to_id`, optional
`data` JSONB, timestamps, and composite unique indexes mirroring Arango persistent
indices:

`follows`, `requests_follow`, `controls`, `mentions`, `audience`, `post_hashtags`,
`entries`, `reactions`, `reply_to`, `repost`, `bookmarks`, `post_seen`, `has_seen`,
`has_read`, `user_groups`, `post_groups`, `has_role`, `profile_access_tokens`,
`account_to_push_subscription`, `created_report`, `is_reported_profile`,
`is_reported_object`, `invite_link_creators`, `invite_link_redeemers`, `jam_recordings`

### Full-text search

Arango inverted indices + search-alias views become generated `tsvector` columns with
GIN indexes (`english` config):

- `profiles.search_vector` — handle, displayName, bio, location, custom fields
- `posts.search_vector` — content, titles, attachment descriptions
- `groups.search_vector` — handle, displayName, description, rules

Queries use `plainto_tsquery('english', …)` and `ts_rank`.

### Foreign keys

Edge `from_id` / `to_id` reference document PKs with `ON DELETE CASCADE` where Arango
cascade-delete behavior applied (e.g. profile → controls edges).

### Migration from Arango

Historical TypeScript data migrations under `db/dataMigrations/` are **not replayed**
on Postgres. The offline export transform applies final document shapes; SQL schema
is the baseline.

## Consequences

- `@openpeepshq/arango-querybuilder` and `arangojs` removed after cutover
- Feed/search queries rewritten as explicit SQL in repositories (no generic graph builder)
- `db/pg/map` remains for existing document/edge call sites; **new features
  prefer Drizzle / SQL-native queries** over deepening that compatibility DSL
- Backups use `pg_dump` / `pg_restore` instead of collection zip export
- Admin DB browser (Aardvark) replaced by Drizzle Studio / `psql` documentation
