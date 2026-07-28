import { and, eq, isNotNull, ne, or, sql } from 'drizzle-orm';
import { posts } from '../schema/documents';
import {
  postHasYesOrMaybeRsvpExpr,
  postReplyCountExpr,
} from '../queries/activity';
import { compareCount } from './common';
import { pgSql, type SqlFilter } from './types';

const eventStart = sql`${posts.body}->>'start'`;
const eventEnd = sql`${posts.body}->>'end'`;

const postsReplyCountExpr = postReplyCountExpr(posts);

export const postFilters = {
  notDirect: (): SqlFilter => pgSql(ne(posts.visibility, 'direct')),

  isDirect: (): SqlFilter => pgSql(eq(posts.visibility, 'direct')),

  hasJam: (): SqlFilter => pgSql(isNotNull(sql`${posts.body}->'jam'`)),

  creatorId: (id: string): SqlFilter => pgSql(eq(posts.creatorId, id)),

  type: (type: string): SqlFilter => pgSql(eq(posts.type, type)),

  replyCount: (
    op: '==' | '!=' | '>' | '>=' | '<' | '<=',
    count: number,
  ): SqlFilter => pgSql(compareCount(postsReplyCountExpr, op, count)),

  replyCountZero: (): SqlFilter => postFilters.replyCount('==', 0),

  replyCountPositive: (): SqlFilter => postFilters.replyCount('>', 0),

  isJamModerator: (profileId: string): SqlFilter =>
    pgSql(sql`${posts.body}->'jam'->'moderators' ? ${profileId}`),

  hasYesOrMaybeRsvp: (profileId: string): SqlFilter =>
    pgSql(postHasYesOrMaybeRsvpExpr(posts, profileId)),
};

export const eventTimeFilters = {
  upcoming: (now = new Date().toISOString()): SqlFilter =>
    pgSql(
      or(
        sql`${eventStart} > ${now}`,
        and(sql`${posts.body}->'end' IS NOT NULL`, sql`${eventEnd} > ${now}`),
      )!,
    ),

  current: (now = new Date().toISOString()): SqlFilter =>
    pgSql(
      and(
        sql`${eventStart} <= ${now}`,
        or(sql`${posts.body}->'end' IS NULL`, sql`${eventEnd} >= ${now}`),
      )!,
    ),

  past: (now = new Date().toISOString()): SqlFilter =>
    pgSql(sql`COALESCE(${eventEnd}, ${eventStart}) < ${now}`),
};
