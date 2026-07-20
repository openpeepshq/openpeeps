export * from './documents';
export * from './edges';

import * as documents from './documents';
import * as edges from './edges';

export const schema = {
  ...documents,
  ...edges,
};

export type Schema = typeof schema;
