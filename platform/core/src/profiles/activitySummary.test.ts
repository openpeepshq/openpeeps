import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  profileActivityCountsSql,
  profileTopPostScoresSql,
  takeTopReadablePosts,
  TOP_POSTS_LIMIT,
} from './activityQueries';

const dialect = new PgDialect();
const toSql = (query: ReturnType<typeof profileActivityCountsSql>) =>
  dialect.sqlToQuery(query);

describe('takeTopReadablePosts', () => {
  it('keeps order and stops at the top-posts limit', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(takeTopReadablePosts(items, (n) => n % 2 === 0)).toEqual([2, 4, 6]);
    expect(takeTopReadablePosts(items, () => true)).toHaveLength(
      TOP_POSTS_LIMIT,
    );
  });
});

describe('profile activity summary SQL', () => {
  it('counts original posts vs replies and excludes DMs and deleted posts', () => {
    const query = toSql(profileActivityCountsSql('profile-id'));

    expect(query.sql).toContain('COUNT(*) FILTER (WHERE NOT EXISTS (');
    expect(query.sql).toContain('COUNT(*) FILTER (WHERE EXISTS (');
    expect(query.sql).toContain('"reply_to"."from_id" = "posts"."id"::text');
    expect(query.sql).toContain('"posts"."creator_id" =');
    expect(query.sql).toContain('"posts"."deleted_at" IS NULL');
    expect(query.sql).toContain('INNER JOIN "posts" received_posts');
    expect(query.sql).toContain('INNER JOIN "posts" reposted_posts');
    expect(query.sql).toContain('INNER JOIN "posts" reply_child_posts');
    expect(query.sql).toContain('INNER JOIN "posts" parent_posts');
    expect(query.sql).toContain('FROM "reactions"');
    expect(query.sql).toContain('FROM "bookmarks"');
    expect(query.sql).toContain('FROM "user_groups"');
    expect(query.params).toContain('profile-id');
  });

  it('ranks non-reply posts by activity score', () => {
    const query = toSql(profileTopPostScoresSql('profile-id'));

    expect(query.sql).toContain('FROM "reactions"');
    expect(query.sql).toContain('FROM "repost"');
    expect(query.sql).toContain('ORDER BY activity_score DESC');
    expect(query.sql).toContain('NOT EXISTS (');
    expect(query.sql).toContain('LIMIT $');
    expect(query.params).toContain('profile-id');
  });
});
