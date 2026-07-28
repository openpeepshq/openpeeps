import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { posts } from '../schema/documents';
import {
  postHasYesOrMaybeRsvpExpr,
  postReplyCountExpr,
  postReplyToCountExpr,
} from './activity';

const dialect = new PgDialect();
const toSql = (query: ReturnType<typeof postReplyCountExpr>) =>
  dialect.sqlToQuery(query);

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
