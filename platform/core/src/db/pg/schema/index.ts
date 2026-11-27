export * from './documents';
export * from './edges';
export * from './analytics';
export * from './calendarFeedTokens';
export * from './ai';

import * as documents from './documents';
import * as edges from './edges';
import * as analytics from './analytics';
import * as calendarFeedTokens from './calendarFeedTokens';
import * as ai from './ai';

export const schema = {
  ...documents,
  ...edges,
  ...analytics,
  ...calendarFeedTokens,
  ...ai,
};

export type Schema = typeof schema;
