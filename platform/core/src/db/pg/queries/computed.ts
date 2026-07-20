import type { ActivityWindow, ComputedField } from '../map/queryTypes';
import {
  groupLastPostAtExpr,
  groupPostsCountExpr,
  postActivityScoreExpr,
  profileActivityScoreExpr,
} from './activity';

export const computedFields = {
  profileActivityScore: (window?: ActivityWindow): ComputedField => ({
    alias: 'activityScore',
    expr: ({ table }) => profileActivityScoreExpr(table, window),
  }),

  postActivityScore: (): ComputedField => ({
    alias: 'activityScore',
    expr: ({ table }) => postActivityScoreExpr(table),
  }),

  groupLastPostAt: (): ComputedField => ({
    alias: 'lastPostAt',
    expr: ({ table }) => groupLastPostAtExpr(table),
  }),

  groupPostsCount: (): ComputedField => ({
    alias: 'postsCount',
    expr: ({ table }) => groupPostsCountExpr(table),
  }),
};
