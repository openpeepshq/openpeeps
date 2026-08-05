export * from './documents';
export * from './edges';
export * from './analytics';

import * as documents from './documents';
import * as edges from './edges';
import * as analytics from './analytics';

export const schema = {
  ...documents,
  ...edges,
  ...analytics,
};

export type Schema = typeof schema;
