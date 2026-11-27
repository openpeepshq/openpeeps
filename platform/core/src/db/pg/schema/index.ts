export * from './documents';
export * from './edges';
export * from './analytics';
export * from './calendarFeedTokens';
export * from './auditLogs';

import * as documents from './documents';
import * as edges from './edges';
import * as analytics from './analytics';
import * as calendarFeedTokens from './calendarFeedTokens';
import * as auditLogs from './auditLogs';

export const schema = {
  ...documents,
  ...edges,
  ...analytics,
  ...calendarFeedTokens,
  ...auditLogs,
};

export type Schema = typeof schema;
