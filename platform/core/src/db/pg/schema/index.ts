export * from './documents';
export * from './edges';
export * from './analytics';
export * from './calendarFeedTokens';
export * from './oauth';

import * as documents from './documents';
import * as edges from './edges';
import * as analytics from './analytics';
import * as calendarFeedTokens from './calendarFeedTokens';
import * as oauth from './oauth';

export const schema = {
  ...documents,
  ...edges,
  ...analytics,
  ...calendarFeedTokens,
  ...oauth,
};

export type Schema = typeof schema;
