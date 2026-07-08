import type { SQL } from 'drizzle-orm';
import type { ActivityWindow, ComputedField } from '../map/queryTypes';
import {
  groupLastPostAtExpr,
  postActivityScoreExpr,
  profileActivityScoreExpr,
} from './activity';

export const computedFields = {
  profileActivityScore: (window?: ActivityWindow): ComputedField => ({
    alias: 'activityScore',
    expr: () => profileActivityScoreExpr(window),
  }),

  postActivityScore: (): ComputedField => ({
    alias: 'activityScore',
    expr: () => postActivityScoreExpr(),
  }),

  groupLastPostAt: (): ComputedField => ({
    alias: 'lastPostAt',
    expr: (): SQL => groupLastPostAtExpr(),
  }),
};
