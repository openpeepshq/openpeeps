import type { SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core';
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import * as schema from '../schema';
import { groups, posts } from '../schema/documents';
import {
  groupLastPostAtExpr,
  groupPostsCountExpr,
  postHasYesOrMaybeRsvpExpr,
  postReplyCountExpr,
  postReplyToCountExpr,
} from './activity';

const dialect = new PgDialect();
const toSql = (query: SQL) => dialect.sqlToQuery(query);

describe('post activity expressions', () => {
  it('builds the reply count as a correlated Drizzle subquery', () => {
    const query = toSql(postReplyCountExpr(posts));

    expect(query.sql).toContain('select count(*) from "reply_to"');
    expect(query.sql).toContain(
      'inner join "posts" "reply_posts" on "reply_posts"."id"::text = "reply_to"."from_id"',
    );
    expect(query.sql).toContain('"reply_to"."to_id" = "posts"."id"::text');
  });

  it('builds reply-to count and RSVP existence expressions', () => {
    expect(toSql(postReplyToCountExpr(posts)).sql).toContain(
      '"reply_to"."from_id" = "posts"."id"::text',
    );

    const rsvp = toSql(postHasYesOrMaybeRsvpExpr(posts, 'profile-id'));
    expect(rsvp.sql).toContain('exists (select "id" from "entries"');
    expect(rsvp.sql).toContain('"entries"."to_id" = "posts"."id"::text');
    expect(rsvp.params).toContain('profile-id');
  });
});

describe('group activity expressions', () => {
  // Render the expressions the way groupsMapping embeds them (computed
  // fields inside a select-object, FROM groups), then collapse whitespace.
  // A standalone `toSql(expr)` keeps `post_groups.created_at` qualified and
  // would not catch the ambiguity that only appears in this embedded form,
  // once the subquery joins posts (both tables have created_at).
  const db = drizzle(new pg.Client(), { schema });
  const embeddedSql = () =>
    db
      .select({
        id: groups.id,
        lastPostAt: groupLastPostAtExpr(groups),
        postsCount: groupPostsCountExpr(groups),
      })
      .from(groups)
      .toSQL()
      .sql.replace(/\s+/g, ' ');

  it('counts only published, non-deleted posts, with every column qualified', () => {
    const sql = embeddedSql();

    expect(sql).toContain('select max("post_groups"."created_at")');
    expect(sql).toContain('from "post_groups" inner join "posts"');
    expect(sql).toContain('"posts"."id"::text = "post_groups"."from_id"');
    expect(sql).toContain('"post_groups"."to_id" = "groups"."id"::text');
    expect(sql).toContain('"posts"."published_at" IS NOT NULL');
    expect(sql).toContain('"posts"."deleted_at" is null');
    // The aggregate must stay qualified: an unqualified "created_at" is
    // ambiguous between post_groups and posts (Postgres 42702).
    expect(sql).not.toContain('max("created_at")');
  });
});
