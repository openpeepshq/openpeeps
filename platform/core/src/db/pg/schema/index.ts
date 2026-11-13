export * from './documents';
export * from './edges';
export * from './analytics';
export * from './calendarFeedTokens';

import * as documents from './documents';
import * as edges from './edges';
import * as analytics from './analytics';
import * as calendarFeedTokens from './calendarFeedTokens';

export const schema = {
  ...documents,
  ...edges,
  ...analytics,
  ...calendarFeedTokens,
};

export type Schema = typeof schema;
